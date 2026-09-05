import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountPage } from './AccountPage';
import type { AccountService } from '../services/accountService';

const service: AccountService = {
  getExecutionHistory: async (executionId) => executionId === 'execution-1'
    ? { achievedActions: 2, completedActionIndexes: [0, 1], completed: true, executedAtLabel: '今日', id: 'execution-1', minutes: 30, routineId: 'routine-1', routineTitle: '朝の集中ルーティン', totalActions: 2 }
    : null,
  getProfile: async () => ({ bio: '毎日続けることが目標。', handle: 'yuki_sleep', initial: 'Y', name: '山田 由紀' }),
  listExecutionHistories: async () => [{ achievedActions: 2, completedActionIndexes: [0, 1], completed: true, executedAtLabel: '今日', id: 'execution-1', minutes: 30, routineId: 'routine-1', routineTitle: '朝の集中ルーティン', totalActions: 2 }],
  listLikes: async () => [{ likedAt: '2026-09-03T12:00:00.000Z', postCategory: 'routine', postId: 'post-1', routineId: 'routine-2', supports: 4, totalLikes: 2 }],
  listPosts: async () => [{ createdAtLabel: '今日', executions: 3, id: 'post-1', likes: 2, routineId: 'routine-1', title: '朝の集中ルーティン' }],
};

function Location() {
  return <output>{useLocation().pathname}</output>;
}

function renderPage(accountService: AccountService = service) {
  return render(<MemoryRouter><AccountPage service={accountService} /><Location /></MemoryRouter>);
}

afterEach(() => cleanup());

describe('AccountPage', () => {
  it('プロフィールと投稿を表示し、投稿からルーティン詳細へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('アカウント情報を読み込んでいます…')).toBeInTheDocument();
    expect(await screen.findByText('山田 由紀')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['1投稿', '-いいね', '1実行履歴']);

    await user.click(screen.getByRole('button', { name: /朝の集中ルーティン/ }));
    expect(screen.getByText('/routines/routine-1')).toBeInTheDocument();
  });

  it('いいねタブで API 由来の一覧を表示し、ルーティン詳細へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('山田 由紀');

    await user.click(screen.getByRole('tab', { name: /いいね/ }));
    expect(await screen.findByText('いいねしたルーティン')).toBeInTheDocument();
    expect(screen.getByText('routine-2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /いいねしたルーティン/ }));
    expect(screen.getByText('/routines/routine-2')).toBeInTheDocument();
  });

  it('いいね API のエラー状態を表示する', async () => {
    const user = userEvent.setup();
    renderPage({ ...service, listLikes: vi.fn().mockRejectedValue(new Error('failed')) });
    await screen.findByText('山田 由紀');

    await user.click(screen.getByRole('tab', { name: /いいね/ }));
    expect(await screen.findByText('いいねしたルーティンを読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
  });

  it('実行履歴から完了ステップを確認する画面へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('山田 由紀');

    await user.click(screen.getByRole('tab', { name: /実行履歴/ }));
    await user.click(screen.getByRole('button', { name: /朝の集中ルーティン/ }));

    expect(screen.getByText('/routines/routine-1/executions/execution-1')).toBeInTheDocument();
  });

  it('プロフィール取得エラーを表示する', async () => {
    renderPage({ ...service, getProfile: vi.fn().mockRejectedValue(new Error('failed')) });

    await waitFor(() => expect(screen.getByText('アカウント情報を読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument());
  });

  it('設定ボタンからアカウント設定画面へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('山田 由紀');

    await user.click(screen.getByRole('button', { name: '設定' }));

    expect(screen.getByText('/account/settings')).toBeInTheDocument();
  });
});
