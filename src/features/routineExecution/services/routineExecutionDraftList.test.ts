import { afterEach, describe, expect, it, vi } from 'vitest';
import { markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import { getRoutineExecutionDraftListSnapshot, notifyRoutineExecutionDraftsChanged, refreshRoutineExecutionDraftList, resetRoutineExecutionDraftListForTesting } from './routineExecutionDraftList';

const draft = {
  executed_at: '2026-10-01T00:00:00.000000+00:00',
  executed_routine_action_identifiers: [],
  routine_execution_identifier: '50000000-0000-4000-8000-000000000001',
  routine_execution_memo: null,
  routine_identifier: '30000000-0000-4000-8000-000000000001',
};

afterEach(() => {
  resetRoutineExecutionDraftListForTesting();
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('routineExecutionDraftList', () => {
  it('backend契約で有効な空のroutine_nameを受理し、他のドラフトを失わない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{ ...draft, routine_name: '' }, { ...draft, routine_execution_identifier: '50000000-0000-4000-8000-000000000002', routine_identifier: '30000000-0000-4000-8000-000000000002', routine_name: '朝のストレッチ' }],
      total: 2,
    }), { status: 200 })));
    markAuthenticated();

    await refreshRoutineExecutionDraftList();

    expect(getRoutineExecutionDraftListSnapshot()).toMatchObject({
      items: [
        { routineId: draft.routine_identifier, routineName: '名称未設定のルーティン' },
        { routineId: '30000000-0000-4000-8000-000000000002', routineName: '朝のストレッチ' },
      ],
      status: 'known',
    });
  });

  it('現在の認証世代で401なら認証切れを区別して公開する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    markAuthenticated();

    await refreshRoutineExecutionDraftList();

    expect(getRoutineExecutionDraftListSnapshot()).toMatchObject({ items: [], status: 'unauthorized' });
  });

  it('一覧GET中の変更通知は旧結果を確定せず、完了後に同じ認証世代で再取得する', async () => {
    const first = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ ...draft, routine_name: '変更後のドラフト' }], total: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    const refresh = refreshRoutineExecutionDraftList();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    notifyRoutineExecutionDraftsChanged();
    first.resolve(new Response(JSON.stringify({ items: [{ ...draft, routine_name: '変更前のドラフト' }], total: 1 }), { status: 200 }));
    await refresh;

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(getRoutineExecutionDraftListSnapshot()).toMatchObject({
      items: [{ routineName: '変更後のドラフト' }],
      status: 'known',
    }));
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}