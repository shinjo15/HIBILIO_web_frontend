import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoutineCreateService, routineCreateApiAdapter } from './routineCreateService';

const validForm = {
  actions: [{ actionMemo: '', actionMinutes: '', actionName: '始める' }],
  routineExecutionMinutes: '',
  routineMemo: '',
  routineName: 'テストルーティン',
};

afterEach(() => vi.restoreAllMocks());

describe('routineCreateService', () => {
  it('変換済み payload を adapter に渡す', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = createRoutineCreateService({ create });

    await service.create(validForm);

    expect(create).toHaveBeenCalledWith({
      routine_actions: [{ routine_action_name: '始める' }],
      routine_name: 'テストルーティン',
    });
  });

  it('API の空の 201 成功を正常終了として扱う', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);

    await routineCreateApiAdapter.create({
      routine_actions: [{ routine_action_name: '始める' }],
      routine_name: 'テストルーティン',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/routines', expect.objectContaining({
      credentials: 'include',
      method: 'POST',
    }));
  });

  it('不正なフォームを adapter に送信しない', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = createRoutineCreateService({ create });

    await expect(service.create({
      ...validForm,
      actions: [],
    })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
