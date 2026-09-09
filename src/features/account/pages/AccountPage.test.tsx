import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountPage } from './AccountPage';
import { AccountUnauthorizedError, type AccountService } from '../services/accountService';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';

const service: AccountService = {
  getExecutionHistory: async (executionId) => executionId === 'execution-1'
    ? { achievedActions: 2, completedActionIndexes: [0, 1], completed: true, executedAtLabel: '今日', id: 'execution-1', minutes: 30, routineId: 'routine-1', routineTitle: '朝の集中ルーティン', totalActions: 2 }
    : null,
  getProfile: async () => ({ accountIdentifier: '11111111-1111-4111-8111-111111111111', bio: '毎日続けることが目標。', favoriteTags: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '睡眠' }], initial: '山', name: '山田 由紀', socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/yuki_sleep' }] }),
  listExecutionHistories: async () => [{ achievedActions: 2, completedActionIndexes: [0, 1], completed: true, executedAtLabel: '今日', id: 'execution-1', minutes: 30, routineId: 'routine-1', routineTitle: '朝の集中ルーティン', totalActions: 2 }],
  listLikes: async () => [{ authorName: '田中 陽介', likedAt: '2026-09-03T12:00:00.000Z', postId: 'post-1', routineId: 'routine-2', supports: 4, title: '夜の読書ルーティン', totalLikes: 2 }],
  listPosts: async () => [{ createdAt: '2026-09-03T12:00:00.000Z', executions: 3, id: 'post-1', likes: 2, routineId: 'routine-1', title: '朝の集中ルーティン' }],
};

function Location() {
  return <output>{useLocation().pathname}</output>;
}

function renderPage(accountService: AccountService = service) {
  return render(<MemoryRouter><AccountPage service={accountService} /><Location /></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('AccountPage', () => {
  it('プロフィールと投稿を表示し、投稿からルーティン詳細へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('アカウント情報を読み込んでいます…')).toBeInTheDocument();
    expect(await screen.findByText('山田 由紀')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.queryByText('11111111-1111-4111-8111-111111111111')).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['1投稿', '-いいね', '1実行履歴']);

    await user.click(screen.getByRole('button', { name: /朝の集中ルーティン/ }));
    expect(screen.getByText('/routines/routine-1')).toBeInTheDocument();
  });

  it('いいねタブで API 由来の一覧を表示し、ルーティン詳細へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('山田 由紀');

    await user.click(screen.getByRole('tab', { name: /いいね/ }));
    expect(await screen.findByText('夜の読書ルーティン')).toBeInTheDocument();
    expect(screen.getByText('田中 陽介')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /夜の読書ルーティン/ }));
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

  it('プロフィール API が401ならログイン通過状態を削除してログインへ遷移する', async () => {
    markAuthenticated();
    renderPage({ ...service, getProfile: vi.fn().mockRejectedValue(new AccountUnauthorizedError()) });

    await waitFor(() => expect(screen.getByText('/login')).toBeInTheDocument());
    expect(isAuthenticated()).toBe(false);
  });

  it('設定ボタンからアカウント設定画面へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('山田 由紀');

    await user.click(screen.getByRole('button', { name: '設定' }));

    expect(screen.getByText('/account/settings')).toBeInTheDocument();
  });
});
