import { describe, expect, it, vi } from 'vitest';
import { createRoutineExecutionService } from './routineExecutionService';

const routine = {
  id: 'routine-1',
  steps: [{ action: '水を飲む', time: '07:00' }],
  title: 'テストルーティン',
};

const completion = {
  achieved: 1,
  comment: '続けられました',
  elapsedMinutes: 5,
  routineId: 'routine-1',
  total: 1,
};

describe('routineExecutionService', () => {
  it('routine DTO を実行画面用 ViewModel に変換する', async () => {
    const get = vi.fn().mockResolvedValue(routine);
    const service = createRoutineExecutionService({ complete: vi.fn(), get });

    await expect(service.get('routine-1')).resolves.toEqual(routine);
    expect(get).toHaveBeenCalledWith('routine-1');
  });

  it('完了結果を dummy adapter に渡し、表示用結果を返す', async () => {
    const complete = vi.fn().mockResolvedValue(completion);
    const service = createRoutineExecutionService({ complete, get: vi.fn() });

    await expect(service.complete(completion)).resolves.toEqual(completion);
    expect(complete).toHaveBeenCalledWith(completion);
  });

  it('不正な完了結果は表示せずに失敗する', async () => {
    const service = createRoutineExecutionService({
      complete: vi.fn().mockResolvedValue({ routineId: 'routine-1' }),
      get: vi.fn(),
    });

    await expect(service.complete(completion)).rejects.toThrow();
  });
});
