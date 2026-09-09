import { describe, expect, it } from 'vitest';
import {
  countAchievedSteps,
  toRoutineExecutionRequest,
  toRoutineExecutionViewModel,
} from './routineExecution';

describe('routineExecution domain', () => {
  it('達成数を純粋関数で計算する', () => {
    expect(countAchievedSteps([true, false, true])).toBe(2);
  });

  it('空の任意メモをリクエストから省略する', () => {
    expect(toRoutineExecutionRequest({
      executedRoutineActionIdentifiers: [],
      memo: '',
      routineIdentifier: '30000000-0000-4000-8000-000000000001',
    })).toEqual({
      executed_routine_action_identifiers: [],
      routine_identifier: '30000000-0000-4000-8000-000000000001',
    });
  });

  it('不正な実行ルーティン DTO を表示用に変換しない', () => {
    expect(() => toRoutineExecutionViewModel({ id: 'invalid' })).toThrow();
  });
});
