import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';
import { RoutineFeedPage } from './RoutineFeedPage';
import { RoutineFeedUnauthorizedError } from '../services/routineFeedService';
import type { Routine } from '../domain/routine';
import type { RoutineFeedService } from '../services/routineFeedService';
import type { RoutineLikeService } from '../services/routineLikeService';
import { accountService } from '../../account/services/accountService';

const routine: Routine = {
  accountId: '10000000-0000-4000-8000-000000000001',
  authorName: '田中 陽介',
  createdAt: '2026-09-04T00:00:00+00:00',
  customizations: 3,
  durationMinutes: 25,
  executions: 12,
  id: 'post-1',
  liked: false,
  likes: 14,
  routineId: 'routine-1',
  steps: [{ action: '水を飲む', durationMinutes: 5 }],
  tags: ['朝活'],
  title: '朝の集中ルーティン',
};

const routinePage2: Routine = { ...routine, id: 'post-2', title: '夜の読書ルーティン' };
const executionRoutine: Routine = { ...routine, executedActionCount: 1, executionMemo: '集中できました', iconImageUrl: 'https://example.com/icons/tanaka.webp', id: 'post-2', postCategory: 'action', routineExecutionId: '20000000-0000-4000-8000-000000000001', supportCount: 3 };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

function renderPage(service: Pick<RoutineFeedService, 'list'> & Partial<Pick<RoutineFeedService, 'listFollowingAccounts' | 'listPage'>>, likeService?: RoutineLikeService) {
  return render(<MemoryRouter><RoutineFeedPage isAuthenticated likeService={likeService} service={{ listFollowingAccounts: async () => [], ...service }} /><LocationProbe /></MemoryRouter>);
}

function LocationProbe() {
  return <output>{useLocation().pathname}</output>;
}

describe('RoutineFeedPage', () => {
  it('loading中の表示からAPI由来の一覧を表示する', async () => {
    let resolveList: ((value: Routine[]) => void) | undefined;
    const service: RoutineFeedService = {
      list: () => new Promise((resolve) => { resolveList = resolve; }),
      listFollowingAccounts: async () => [],
    };

    renderPage(service);
    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.getByText('今日を重ねるSNS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ルーティンを検索' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['フォロー中', 'おすすめ', '人気', 'フォロー中アカウント']);
    expect(screen.getByText('ルーティンを読み込んでいます…')).toBeInTheDocument();

    resolveList?.([routine]);
    expect(await screen.findByRole('heading', { name: '朝の集中ルーティン' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '田中 陽介' })).toHaveAttribute('href', '/accounts/10000000-0000-4000-8000-000000000001');
    expect(screen.getByRole('link', { name: '田中 陽介' })).toHaveClass('routine-card__author-link');
    expect(screen.getByRole('link', { name: '朝の集中ルーティン' })).toHaveAttribute('href', '/routines/routine-1');
    expect(screen.getByRole('button', { name: 'いいねする' })).toBeEnabled();
  });

  it('empty状態を表示する', async () => {
    renderPage({ list: async () => [] });

    expect(await screen.findByRole('heading', { name: 'ルーティンが見つかりません' })).toBeInTheDocument();
  });

  it('フィード上部に検索アイコンを表示しない', async () => {
    renderPage({ list: async () => [] });

    expect(screen.queryByRole('button', { name: 'ルーティンを検索' })).not.toBeInTheDocument();
  });

  it('末尾カードの表示で2ページ目を末尾へ追加し、total到達後は追加取得しない', async () => {
    let notifyIntersection: (() => void) | undefined;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }

      disconnect() {}
      observe() {}
      unobserve() {}
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
    });
    const listPage = vi.fn()
      .mockResolvedValueOnce({ items: [routine], total: 2 })
      .mockResolvedValueOnce({ items: [routinePage2], total: 2 });
    renderPage({ list: async () => [], listPage });

    await screen.findByRole('heading', { name: '朝の集中ルーティン' });
    notifyIntersection?.();
    expect(await screen.findByRole('heading', { name: '夜の読書ルーティン' })).toBeInTheDocument();
    notifyIntersection?.();
    await waitFor(() => expect(listPage).toHaveBeenCalledTimes(2));
    expect(listPage).toHaveBeenNthCalledWith(1, 'recommended', 1);
    expect(listPage).toHaveBeenNthCalledWith(2, 'recommended', 2);
  });

  it('いいね成功時にカードの状態と件数を更新する', async () => {
    const user = userEvent.setup();
    const likeService: RoutineLikeService = { create: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
    renderPage({ list: async () => [routine] }, likeService);
    await screen.findByRole('heading', { name: '朝の集中ルーティン' });

    await user.click(screen.getByRole('button', { name: 'いいねする' }));

    expect(likeService.create).toHaveBeenCalledWith('post-1');
    expect(screen.getByRole('button', { name: 'いいねを取り消す' })).toHaveTextContent('15');

    await user.click(screen.getByRole('button', { name: 'いいねを取り消す' }));

    expect(likeService.remove).toHaveBeenCalledWith('post-1');
    expect(screen.getByRole('button', { name: 'いいねする' })).toHaveTextContent('14');
  });

  it('タップ直後にいいね状態とバーストアニメーションを表示して対象ボタンを無効化する', async () => {
    let resolveCreate: (() => void) | undefined;
    const user = userEvent.setup();
    const likeService: RoutineLikeService = {
      create: () => new Promise((resolve) => { resolveCreate = resolve; }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    renderPage({ list: async () => [routine] }, likeService);
    await screen.findByRole('heading', { name: '朝の集中ルーティン' });

    await user.click(screen.getByRole('button', { name: 'いいねする' }));

    expect(screen.getByRole('button', { name: 'いいねを取り消す' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'いいねを取り消す' })).toHaveClass('routine-card__like--like-animation');
    expect(screen.getByRole('button', { name: 'いいねを取り消す' })).toHaveTextContent('15');
    resolveCreate?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'いいねを取り消す' })).toBeEnabled());
  });

  it('複数投稿のいいねが同時進行中でも、先に完了した投稿は他方を再送可能にしない', async () => {
    const resolveCreates = new Map<string, () => void>();
    const user = userEvent.setup();
    const likeService: RoutineLikeService = {
      create: vi.fn((postIdentifier: string) => new Promise<void>((resolve) => { resolveCreates.set(postIdentifier, resolve); })),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    renderPage({ list: async () => [routine, routinePage2] }, likeService);
    await screen.findByRole('heading', { name: '朝の集中ルーティン' });

    const likeButtons = screen.getAllByRole('button', { name: 'いいねする' });
    await user.click(likeButtons[0]);
    await user.click(likeButtons[1]);
    expect(likeService.create).toHaveBeenCalledTimes(2);
    const pendingButtons = screen.getAllByRole('button', { name: 'いいねを取り消す' });
    expect(pendingButtons).toHaveLength(2);
    expect(pendingButtons[0]).toBeDisabled();
    expect(pendingButtons[1]).toBeDisabled();

    resolveCreates.get('post-1')?.();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'いいねを取り消す' })[0]).toBeEnabled());
    expect(screen.getAllByRole('button', { name: 'いいねを取り消す' })[1]).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: 'いいねを取り消す' })[1]);
    expect(likeService.create).toHaveBeenCalledTimes(2);

    resolveCreates.get('post-2')?.();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'いいねを取り消す' })[1]).toBeEnabled());
  });

  it('未認証時は人気タブだけを表示して人気一覧を取得する', async () => {
    const list = vi.fn().mockResolvedValue([routine]);
    render(<MemoryRouter><RoutineFeedPage isAuthenticated={false} service={{ list, listFollowingAccounts: async () => [] }} /></MemoryRouter>);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['人気']);
    await waitFor(() => expect(list).toHaveBeenCalledWith('popular'));
  });

  it('ログイン通過後に再表示すると3タブを表示する', () => {
    markAuthenticated();
    render(<MemoryRouter><RoutineFeedPage service={{ list: async () => [routine], listFollowingAccounts: async () => [] }} /></MemoryRouter>);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['フォロー中', 'おすすめ', '人気', 'フォロー中アカウント']);
  });

  it('401を含むエラー状態と再試行導線を表示する', async () => {
    const list = vi.fn().mockRejectedValue(new Error('401'));
    renderPage({ list });

    expect(await screen.findByText('ルーティンを読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '再試行' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('認証必須APIが401ならログイン通過状態を削除してログインへ遷移する', async () => {
    markAuthenticated();
    const service: RoutineFeedService = { list: async () => { throw new RoutineFeedUnauthorizedError(); }, listFollowingAccounts: async () => [] };
    render(<MemoryRouter><RoutineFeedPage isAuthenticated service={service} /><LocationProbe /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('/login')).toBeInTheDocument());
    expect(isAuthenticated()).toBe(false);
  });

  it('タブ切替時に対応するタブ値をserviceへ渡す', async () => {
    const list = vi.fn().mockResolvedValue([routine]);
    const listFollowingAccounts = vi.fn().mockResolvedValue([{ accountIdentifier: '22222222-2222-4222-8222-222222222222', bio: '朝の時間を大切にしています。', name: '田中 花子' }]);
    const user = userEvent.setup();
    renderPage({ list, listFollowingAccounts });
    await screen.findByRole('heading', { name: '朝の集中ルーティン' });

    await user.click(screen.getByRole('tab', { name: 'フォロー中' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith('following'));
    await user.click(screen.getByRole('tab', { name: '人気' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith('popular'));
    await user.click(screen.getByRole('tab', { name: 'フォロー中アカウント' }));
    await waitFor(() => expect(listFollowingAccounts).toHaveBeenCalledWith());
    expect(await screen.findByText('田中 花子')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '田中 花子' })).toHaveAttribute('href', '/accounts/22222222-2222-4222-8222-222222222222');
  });

  it('フォロー中の実行投稿を実行履歴カードで表示し、選択時に実行詳細へ遷移する', async () => {
    const list = vi.fn().mockImplementation(async (tab: string) => tab === 'following' ? [executionRoutine] : [routine]);
    const user = userEvent.setup();
    renderPage({ list });

    await screen.findByRole('heading', { name: '朝の集中ルーティン' });
    expect(screen.getByRole('link', { name: '朝の集中ルーティン' })).toHaveAttribute('href', '/routines/routine-1');

    await user.click(screen.getByRole('tab', { name: 'フォロー中' }));
    const executionCard = await screen.findByRole('button', { name: '朝の集中ルーティン' });
    expect(executionCard.closest('.routine-feed-execution-post')).toBeInTheDocument();
    const executionCardRoot = executionCard.closest('.account-page__card');
    expect(executionCardRoot).not.toBeNull();
    expect(executionCardRoot?.querySelector('.routine-card__author')).toHaveTextContent('田中 陽介');
    expect(executionCardRoot?.querySelector('.routine-card__avatar')).toContainElement(executionCardRoot?.querySelector('.account-avatar__image') ?? null);
    expect(executionCardRoot?.querySelector('.account-avatar__image')).toHaveAttribute('src', 'https://example.com/icons/tanaka.webp');
    expect(screen.getByText('集中できました')).toBeInTheDocument();
    expect(screen.getByText('達成項目数')).toHaveTextContent('1');
    expect(screen.getByText('応援')).toHaveTextContent('3');

    await user.click(executionCard);

    expect(screen.getByText('/routines/routine-1/executions/20000000-0000-4000-8000-000000000001')).toBeInTheDocument();
  });

  it('匿名ユーザーの実行投稿は三点メニューからログイン誘導の通報フォームを開く', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RoutineFeedPage isAuthenticated={false} service={{ list: async () => [executionRoutine], listFollowingAccounts: async () => [] }} /></MemoryRouter>);

    await screen.findByRole('button', { name: '投稿のメニュー' });
    await user.click(screen.getByRole('button', { name: '投稿のメニュー' }));
    await user.click(screen.getByRole('menuitem', { name: 'この投稿を通報' }));

    expect(await screen.findByRole('heading', { name: 'この投稿を通報' })).toBeInTheDocument();
  });

  it('プロフィール取得中またはPromise reject後の認証済み実行投稿では通報メニューを表示しない', async () => {
    let rejectProfile: (reason: Error) => void;
    const profile = new Promise<never>((_, reject) => { rejectProfile = reject; });
    vi.spyOn(accountService, 'getProfile').mockReturnValue(profile);
    renderPage({ list: async () => [executionRoutine] });

    await screen.findByRole('button', { name: '朝の集中ルーティン' });
    expect(screen.queryByRole('button', { name: '投稿のメニュー' })).not.toBeInTheDocument();

    rejectProfile!(new Error('network'));
    await expect(profile).rejects.toThrow('network');
    await waitFor(() => expect(screen.queryByRole('button', { name: '投稿のメニュー' })).not.toBeInTheDocument());
  });

  it('認証済み他人の実行投稿には通報メニューを表示する', async () => {
    vi.spyOn(accountService, 'getProfile').mockResolvedValue({ accountIdentifier: 'other-account' } as never);
    renderPage({ list: async () => [executionRoutine] });

    expect(await screen.findByRole('button', { name: '投稿のメニュー' })).toBeInTheDocument();
  });

  it('認証済み本人の実行投稿には通報メニューを表示しない', async () => {
    vi.spyOn(accountService, 'getProfile').mockResolvedValue({ accountIdentifier: executionRoutine.accountId } as never);
    renderPage({ list: async () => [executionRoutine] });

    await screen.findByRole('button', { name: '朝の集中ルーティン' });
    await waitFor(() => expect(screen.queryByRole('button', { name: '投稿のメニュー' })).not.toBeInTheDocument());
  });
});