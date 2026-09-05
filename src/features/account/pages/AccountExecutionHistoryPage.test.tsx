import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AccountExecutionHistoryPage } from './AccountExecutionHistoryPage';
import type { AccountService } from '../services/accountService';
import type { RoutineExecutionService } from '../../routineExecution/services/routineExecutionService';

const accountService: AccountService = {
  getExecutionHistory: async () => ({
    achievedActions: 1,
    completedActionIndexes: [0],
    completed: false,
    executedAtLabel: '今日',
    id: 'execution-1',
    minutes: 15,
    routineId: 'routine-1',
    routineTitle: 'テストルーティン',
    totalActions: 2,
  }),
  getProfile: async () => ({ bio: '', handle: 'test', initial: 'T', name: 'テスト' }),
  listExecutionHistories: async () => [],
  listLikes: async () => [],
  listPosts: async () => [],
};

const routineExecutionService: RoutineExecutionService = {
  complete: async (result) => result,
  get: async () => ({
    id: 'routine-1',
    steps: [
      { action: '水を飲む', time: '07:00' },
      { action: 'ストレッチ', time: '07:05' },
    ],
    title: 'テストルーティン',
  }),
};

afterEach(() => cleanup());

describe('AccountExecutionHistoryPage', () => {
  it('完了したステップをチェック済みかつ読み取り専用で表示する', async () => {
    render(
      <MemoryRouter initialEntries={['/routines/routine-1/executions/execution-1']}>
        <Routes>
          <Route element={<AccountExecutionHistoryPage accountService={accountService} routineExecutionService={routineExecutionService} />} path="/routines/:routineId/executions/:executionId" />
        </Routes>
      </MemoryRouter>,
    );

    const completedStep = await screen.findByRole('button', { name: /水を飲む/ });
    const incompleteStep = screen.getByRole('button', { name: /ストレッチ/ });

    expect(completedStep).toHaveAttribute('aria-pressed', 'true');
    expect(completedStep).toBeDisabled();
    expect(incompleteStep).toHaveAttribute('aria-pressed', 'false');
    expect(incompleteStep).toBeDisabled();
  });
});
