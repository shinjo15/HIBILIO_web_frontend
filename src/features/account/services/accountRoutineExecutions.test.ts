import { describe, expect, it } from 'vitest';
import { parseAccountRoutineExecutionsPage } from './accountRoutineExecutions';

describe('parseAccountRoutineExecutionsPage', () => {
  it('実行日時を返さないAPIでは posted_at を別の executedAt に混同せず、そのまま返す', () => {
    const result = parseAccountRoutineExecutionsPage({
      items: [{
        executed_action_count: 2,
        posted_at: null,
        routine_execution_identifier: 'execution-1',
        routine_execution_memo: '集中できました',
        routine_identifier: 'routine-1',
        routine_name: '朝の集中ルーティン',
        support_count: null,
      }],
      total: 1,
    });

    expect(result).toEqual({
      items: [{
        executedActionCount: 2,
        id: 'execution-1',
        memo: '集中できました',
        postedAt: null,
        routineId: 'routine-1',
        routineTitle: '朝の集中ルーティン',
        supportCount: null,
      }],
      total: 1,
    });
  });

  it('APIが返したitemsの順序を並べ替えずに保持する', () => {
    const result = parseAccountRoutineExecutionsPage({
      items: [
        { executed_action_count: 1, posted_at: '2026-09-04T12:00:00+00:00', routine_execution_identifier: 'execution-2', routine_execution_memo: null, routine_identifier: 'routine-1', routine_name: '二番目', support_count: 0 },
        { executed_action_count: 2, posted_at: '2026-09-03T12:00:00+00:00', routine_execution_identifier: 'execution-1', routine_execution_memo: null, routine_identifier: 'routine-1', routine_name: '最初', support_count: 3 },
      ],
      total: 2,
    });

    expect(result.items.map((item) => item.id)).toEqual(['execution-2', 'execution-1']);
  });
});
