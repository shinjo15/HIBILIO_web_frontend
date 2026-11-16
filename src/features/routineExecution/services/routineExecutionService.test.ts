import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRoutineExecutionAdapter, createRoutineExecutionService, RoutineExecutionSessionChangedError } from './routineExecutionService';
import { clearAuthenticated, getAuthenticationGeneration, markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';

const routine = {
  id: '30000000-0000-4000-8000-000000000001',
  steps: [{ action: '水を飲む', id: '40000000-0000-4000-8000-000000000001' }],
  title: 'テストルーティン',
};
const routineId = routine.id;

afterEach(() => {
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('routineExecutionService', () => {
  it('routine DTOを実行画面用ViewModelに変換する', async () => {
    const get = vi.fn().mockResolvedValue(routine);
    const service = createRoutineExecutionService({ complete: vi.fn(), delete: vi.fn(), getDraft: vi.fn(), get, start: vi.fn(), updateAction: vi.fn(), updateMemo: vi.fn() });

    await expect(service.get(routineId)).resolves.toEqual(routine);
    expect(get).toHaveBeenCalledWith(routineId);
  });

  it('開始時に本人のドラフトを取得し、ない場合だけドラフト作成APIへPOSTする', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRoutineExecutionAdapter.start(routineId)).resolves.toEqual({ executedRoutineActionIdentifiers: [], memo: '' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/my/routine-execution-drafts', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/routine-execution-drafts', expect.objectContaining({
      body: JSON.stringify({ routine_identifier: routineId }), method: 'POST',
    }));
  });

  it('同じルーティンの既存ドラフトを再開し、作成しない', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      items: [{ executed_routine_action_identifiers: [routine.steps[0].id], routine_execution_memo: '続き', routine_identifier: routineId }], total: 1,
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRoutineExecutionAdapter.start(routineId)).resolves.toEqual({
      executedRoutineActionIdentifiers: [routine.steps[0].id], memo: '続き',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('開始時の一覧取得中に認証世代が切り替わると、切替後のアカウントでCSRF取得・ドラフト作成をしない', async () => {
    let resolveDraftListBody: (value: { items: []; total: 0 }) => void = () => undefined;
    const fetchMock = vi.fn().mockResolvedValueOnce({
      json: () => new Promise((resolve) => { resolveDraftListBody = resolve; }),
      ok: true,
    });
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    const starting = apiRoutineExecutionAdapter.start(routineId);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/my/routine-execution-drafts', { credentials: 'include', method: 'GET' }));
    markAuthenticated();
    resolveDraftListBody({ items: [], total: 0 });

    await expect(starting).rejects.toBeInstanceOf(RoutineExecutionSessionChangedError);
    expect(fetchMock).not.toHaveBeenCalledWith('/api/csrf-token', expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith('/api/routine-execution-drafts', expect.anything());
  });

  it('開始作成が409競合なら再取得したドラフトを開く', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{
        executed_routine_action_identifiers: [routine.steps[0].id], routine_execution_memo: '他端末で開始', routine_identifier: routineId,
      }], total: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRoutineExecutionAdapter.start(routineId)).resolves.toEqual({
      executedRoutineActionIdentifiers: [routine.steps[0].id], memo: '他端末で開始',
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('アクションと一言を個別PATCHし、空の一言はnullで保存する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'one' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'two' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRoutineExecutionAdapter.updateAction(routineId, routine.steps[0].id, true);
    await apiRoutineExecutionAdapter.updateMemo(routineId, '');

    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/routines/${routineId}/execution-draft/actions`, expect.objectContaining({
      body: JSON.stringify({ is_executed: true, routine_action_identifier: routine.steps[0].id }), method: 'PATCH',
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, `/api/routines/${routineId}/execution-draft/memo`, expect.objectContaining({
      body: JSON.stringify({ routine_execution_memo: null }), method: 'PATCH',
    }));
  });

  it('一言が31文字を超える場合はAPIへ保存しない', async () => {
    const updateMemo = vi.fn();
    const service = createRoutineExecutionService({ complete: vi.fn(), delete: vi.fn(), getDraft: vi.fn(), get: vi.fn(), start: vi.fn(), updateAction: vi.fn(), updateMemo });

    await expect(service.updateMemo(routineId, 'あ'.repeat(32))).rejects.toThrow('ひとことは31文字以内で入力してください。');
    expect(updateMemo).not.toHaveBeenCalled();
  });

  it.each([
    ['ドラフト作成', () => apiRoutineExecutionAdapter.start(routineId), '/api/routine-execution-drafts'],
    ['アクション保存', () => apiRoutineExecutionAdapter.updateAction(routineId, routine.steps[0].id, true), `/api/routines/${routineId}/execution-draft/actions`],
    ['一言保存', () => apiRoutineExecutionAdapter.updateMemo(routineId, '保存前'), `/api/routines/${routineId}/execution-draft/memo`],
    ['完了', () => apiRoutineExecutionAdapter.complete(routineId), `/api/routines/${routineId}/execution-draft/complete`],
    ['削除', () => apiRoutineExecutionAdapter.delete(routineId), `/api/routines/${routineId}/execution-draft`],
  ])('%sはCSRF取得中にアカウントが切り替わると別Cookieでmutationを送信しない', async (_name, invoke, mutationPath) => {
    let resolveCsrf: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn((path: string) => {
      if (path === '/api/my/routine-execution-drafts') {
        return Promise.resolve(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }));
      }
      if (path === '/api/csrf-token') {
        return new Promise<Response>((resolve) => { resolveCsrf = resolve; });
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    const pendingMutation = invoke();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/csrf-token', { credentials: 'include', method: 'GET' }));
    clearAuthenticated();
    markAuthenticated();
    resolveCsrf(new Response(JSON.stringify({ csrf_token: 'old-account-token' }), { status: 200 }));

    await expect(pendingMutation).rejects.toBeInstanceOf(RoutineExecutionSessionChangedError);
    expect(fetchMock).not.toHaveBeenCalledWith(mutationPath, expect.anything());
  });

  it('完了APIが401を返すと認証切れとして扱えるエラーを送出する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRoutineExecutionAdapter.complete(routineId)).rejects.toMatchObject({ status: 401 });
  });

  it('削除APIはCSRF付きDELETEを送り、204以外をstatus付きエラーにする', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRoutineExecutionAdapter.delete(routineId)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/routines/${routineId}/execution-draft`, expect.objectContaining({ method: 'DELETE' }));
  });

  it('削除開始前にアカウントが切り替わった場合、切替後のCookieでDELETEを送らない', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();
    const firstGeneration = getAuthenticationGeneration();
    markAuthenticated();

    await expect(apiRoutineExecutionAdapter.delete(routineId, firstGeneration)).rejects.toBeInstanceOf(RoutineExecutionSessionChangedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});