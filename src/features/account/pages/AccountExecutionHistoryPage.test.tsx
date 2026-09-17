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
    expect(screen.getByText('実行中')).toBeInTheDocument();
    expect(screen.getByText('2/2 完了')).toBeInTheDocument();
    expect(screen.getByText('チェックを入れながら進めてください。')).toBeInTheDocument();
    expect(screen.getByLabelText('ひとこと（任意）')).toHaveValue('集中できました');
    expect(screen.getByLabelText('ひとこと（任意）')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: '実行結果を投稿する' })).not.toBeInTheDocument();
    expect(screen.queryByText('実行日時')).not.toBeInTheDocument();
    expect(screen.queryByText('朝の習慣')).not.toBeInTheDocument();
  });

  it('実行メモがない場合も読み取り専用のひとこと入力欄を表示する', async () => {
    render(
      <MemoryRouter initialEntries={['/routines/routine-1/executions/execution-1']}>
        <Routes>
          <Route element={<AccountExecutionHistoryPage accountService={{ ...accountService, getExecutionHistory: async () => ({ ...(await accountService.getExecutionHistory('execution-1'))!, memo: null }) }} />} path="/routines/:routineId/executions/:executionId" />
        </Routes>
      </MemoryRouter>,
    );

    const memo = await screen.findByLabelText('ひとこと（任意）');
    expect(memo).toHaveValue('');
    expect(memo).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: '実行結果を投稿する' })).not.toBeInTheDocument();
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

    await screen.findByLabelText('ひとこと（任意）');
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
