import { describe, expect, it } from 'vitest';
import {
  calculateElapsedMinutes,
  calculateProgressPercentage,
  countAchievedSteps,
  toRoutineExecutionViewModel,
} from './routineExecution';

describe('routineExecution domain', () => {
  it('達成数と進捗率を純粋関数で計算する', () => {
    expect(countAchievedSteps([true, false, true])).toBe(2);
    expect(calculateProgressPercentage(2, 3)).toBe(67);
    expect(calculateProgressPercentage(4, 3)).toBe(100);
    expect(calculateProgressPercentage(0, 0)).toBe(0);
  });

  it('経過時間は分単位で計算し、開始直後は1分として表示する', () => {
    expect(calculateElapsedMinutes(0, 30_000)).toBe(1);
    expect(calculateElapsedMinutes(0, 90_000)).toBe(2);
  });

  it('不正な実行ルーティン DTO を表示用に変換しない', () => {
    expect(() => toRoutineExecutionViewModel({ id: 'invalid' })).toThrow();
  });
});
