import { describe, expect, it } from 'vitest';
import {
  reorderRoutineCreateActions,
  toRoutineCreateRequest,
  validateRoutineCreateForm,
} from './routineCreate';

const form = {
  actions: [
    {
      actionMemo: '最初に水分をとる',
      actionMinutes: '5',
      actionName: '水を飲む',

    },
  ],
  routineExecutionMinutes: '30',
  routineMemo: '仕事前に集中するための習慣',
  routineName: '朝のルーティン',
};

describe('routineCreate domain', () => {
  it('フォームを CreateRoutineRequest に変換し、表示専用の時刻を除外する', () => {
    expect(toRoutineCreateRequest(form)).toEqual({
      routine_actions: [
        {
          routine_action_minutes: 5,
          routine_action_memo: '最初に水分をとる',
          routine_action_name: '水を飲む',
        },
      ],
      routine_execution_minutes: 30,
      routine_memo: '仕事前に集中するための習慣',
      routine_name: '朝のルーティン',
    });
    expect(toRoutineCreateRequest(form)).not.toHaveProperty('tag_identifiers');
    expect(toRoutineCreateRequest(form).routine_actions[0]).not.toHaveProperty('time');
  });

  it('空の任意項目は payload から省略する', () => {
    expect(toRoutineCreateRequest({
      ...form,
      actions: [{ ...form.actions[0], actionMemo: '', actionMinutes: '' }],
      routineExecutionMinutes: '',
      routineMemo: '   ',
    })).toEqual({
      routine_actions: [{ routine_action_name: '水を飲む' }],
      routine_name: '朝のルーティン',
    });
  });

  it('必須項目、文字数、数値、ステップ数を検証する', () => {
    expect(validateRoutineCreateForm({ ...form, routineName: '   ' }).success).toBe(false);
    expect(validateRoutineCreateForm({ ...form, routineName: 'a'.repeat(51) }).success).toBe(false);
    expect(validateRoutineCreateForm({ ...form, routineExecutionMinutes: '1.5' }).success).toBe(false);
    expect(validateRoutineCreateForm({ ...form, actions: [] }).success).toBe(false);
    expect(validateRoutineCreateForm({
      ...form,
      actions: [{ ...form.actions[0], actionMinutes: '0' }],
    }).success).toBe(false);
  });

  it('ステップの並び順を純粋関数で変更する', () => {
    const actions = [
      { actionMemo: '', actionMinutes: '', actionName: '一番目' },
      { actionMemo: '', actionMinutes: '', actionName: '二番目' },
    ];

    expect(reorderRoutineCreateActions(actions, 1, 0).map((action) => action.actionName)).toEqual(['二番目', '一番目']);
    expect(actions.map((action) => action.actionName)).toEqual(['一番目', '二番目']);
  });
});
