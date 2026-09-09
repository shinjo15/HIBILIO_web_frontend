import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRoutineExecutionAdapter, createRoutineExecutionService } from './routineExecutionService';

const routine = {
  id: '30000000-0000-4000-8000-000000000001',
  steps: [{ action: '水を飲む', id: '40000000-0000-4000-8000-000000000001' }],
  title: 'テストルーティン',
};

const form = {
  executedRoutineActionIdentifiers: ['40000000-0000-4000-8000-000000000001'],
  memo: '続けられました',
  routineIdentifier: '30000000-0000-4000-8000-000000000001',
};

afterEach(() => vi.unstubAllGlobals());

describe('routineExecutionService', () => {
  it('routine DTO を実行画面用 ViewModel に変換する', async () => {
    const get = vi.fn().mockResolvedValue(routine);
    const service = createRoutineExecutionService({ create: vi.fn(), get });

    await expect(service.get('routine-1')).resolves.toEqual(routine);
    expect(get).toHaveBeenCalledWith('routine-1');
  });

  it('作成フォームをAPIリクエストへ変換する', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = createRoutineExecutionService({ create, get: vi.fn() });

    await expect(service.create(form)).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledWith({
      executed_routine_action_identifiers: form.executedRoutineActionIdentifiers,
      routine_execution_memo: form.memo,
      routine_identifier: form.routineIdentifier,
    });
  });

  it('CSRFトークンを取得して実行作成APIへPOSTする', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRoutineExecutionAdapter.create({
      executed_routine_action_identifiers: form.executedRoutineActionIdentifiers,
      routine_execution_memo: form.memo,
      routine_identifier: form.routineIdentifier,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/routine-executions', expect.objectContaining({
      body: JSON.stringify({
        executed_routine_action_identifiers: form.executedRoutineActionIdentifiers,
        routine_execution_memo: form.memo,
        routine_identifier: form.routineIdentifier,
      }),
      method: 'POST',
    }));
  });
});
