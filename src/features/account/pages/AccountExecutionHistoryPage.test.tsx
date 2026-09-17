import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AccountExecutionHistoryPage } from './AccountExecutionHistoryPage';
import type { AccountService } from '../services/accountService';

const accountService: AccountService = {
  getExecutionHistory: async () => ({
    actions: [
      { id: 'action-1', memo: 'コップを用意する', minutes: 5, name: '水を飲む' },
      { id: 'action-2', memo: null, minutes: 10, name: 'ストレッチ' },
    ],
    executedAt: '2026-09-03T12:00:00+00:00',
    id: 'execution-1',
    memo: '集中できました',
    postedAt: '2026-09-03T12:30:00+00:00',
    routineId: 'routine-1',
    routineMemo: '朝の習慣',
    routineTitle: 'テストルーティン',
    supportCount: 3,
    tags: [{ id: 'tag-1', name: '朝活' }],
  }),
  getProfile: async () => ({ accountIdentifier: '11111111-1111-4111-8111-111111111111', bio: '', favoriteTags: [], initial: 'テ', name: 'テスト', socialLinks: [] }),
  listExecutionHistories: async () => [],
  listBlockedAccounts: async () => [],
  listLikes: async () => [],
  listPosts: async () => [],
};

function Location() {
  return <output>{useLocation().pathname}</output>;
}


afterEach(() => cleanup());

describe('AccountExecutionHistoryPage', () => {
  it('完了したステップをチェック済みかつ読み取り専用で表示する', async () => {
    render(
      <MemoryRouter initialEntries={['/routines/routine-1/executions/execution-1']}>
        <Routes>
          <Route element={<AccountExecutionHistoryPage accountService={accountService} />} path="/routines/:routineId/executions/:executionId" />
        </Routes>
      </MemoryRouter>,
    );

    const completedStep = await screen.findByRole('button', { name: /水を飲む/ });
    const completedSecondStep = screen.getByRole('button', { name: /ストレッチ/ });

    expect(completedStep).toHaveAttribute('aria-pressed', 'true');
    expect(completedStep).toBeDisabled();
    expect(completedSecondStep).toHaveAttribute('aria-pressed', 'true');
    expect(completedSecondStep).toBeDisabled();
    expect(screen.getByText('実行済み 2項目')).toBeInTheDocument();
    expect(screen.getByText('朝の習慣')).toBeInTheDocument();
    expect(screen.getByText('集中できました')).toBeInTheDocument();
    expect(screen.getByText('朝活')).toBeInTheDocument();
    expect(screen.getByText('コップを用意する')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('戻る操作で直前の画面へ戻る', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/previous', '/routines/routine-1/executions/execution-1']} initialIndex={1}>
        <Routes>
          <Route element={<AccountExecutionHistoryPage accountService={accountService} />} path="/routines/:routineId/executions/:executionId" />
        </Routes>
        <Location />
      </MemoryRouter>,
    );

    await screen.findByText('集中できました');
    await user.click(screen.getByRole('button', { name: '実行をキャンセルする' }));

    expect(screen.getByText('/previous')).toBeInTheDocument();
  });

  it('実行詳細が見つからない場合は見つからない状態を表示する', async () => {
    render(
      <MemoryRouter initialEntries={['/routines/routine-1/executions/execution-1']}>
        <Routes>
          <Route element={<AccountExecutionHistoryPage accountService={{ ...accountService, getExecutionHistory: async () => null }} />} path="/routines/:routineId/executions/:executionId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('実行履歴が見つかりませんでした。')).toBeInTheDocument();
  });

  it('実行詳細の取得に失敗した場合はエラー状態を表示する', async () => {
    render(
      <MemoryRouter initialEntries={['/routines/routine-1/executions/execution-1']}>
        <Routes>
          <Route element={<AccountExecutionHistoryPage accountService={{ ...accountService, getExecutionHistory: async () => { throw new Error('failed'); } }} />} path="/routines/:routineId/executions/:executionId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('アカウント情報を読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
  });
});
