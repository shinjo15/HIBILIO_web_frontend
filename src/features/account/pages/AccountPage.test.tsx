import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountPage } from './AccountPage';
import { AccountUnauthorizedError, type AccountService } from '../services/accountService';
import { AccountBlockUnauthorizedError, type AccountBlockService } from '../services/accountBlockService';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';

const firstPost = { accountId: '11111111-1111-4111-8111-111111111111', authorName: '山田 由紀', createdAt: '2026-09-03T12:00:00.000Z', customizations: 1, durationMinutes: 30, executions: 3, iconImageUrl: 'https://example.com/icons/post-author.webp', id: 'post-1', liked: false, likes: 2, routineId: 'routine-1', steps: [{ action: '集中', durationMinutes: 30 }], supports: 4, tags: ['睡眠'], title: '朝の集中ルーティン' };
const likedPost = { accountId: '11111111-1111-4111-1111-111111111111', authorName: '田中 陽介', createdAt: '2026-09-03T12:00:00.000Z', customizations: 1, durationMinutes: 20, executions: 3, iconImageUrl: 'https://example.com/icons/liked-author.webp', id: 'post-2', liked: true, likes: 2, routineId: 'routine-2', steps: [{ action: '読書', durationMinutes: 20 }], supports: 4, tags: ['読書'], title: '夜の読書ルーティン' };

const service: AccountService = {
  getExecutionHistory: async (executionId) => executionId === 'execution-1'
    ? { actions: [], executedAt: '2026-09-03T12:00:00+00:00', id: 'execution-1', memo: null, postedAt: '2026-09-03T12:00:00+00:00', routineId: 'routine-1', routineMemo: null, routineTitle: '朝の集中ルーティン', supportCount: 3, tags: [] }
    : null,
  getProfile: async () => ({ accountIdentifier: '11111111-1111-4111-8111-111111111111', bio: '毎日続けることが目標。', favoriteTags: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '睡眠' }], headerImageUrl: 'https://example.com/headers/yamada.webp', initial: '山', iconImageUrl: 'https://example.com/icons/yamada.webp', name: '山田 由紀', socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/yuki_sleep' }] }),
  listExecutionHistories: async () => [{ executedActionCount: 2, id: 'execution-1', memo: '集中できました', postedAt: '2026-09-03T12:00:00+00:00', routineId: 'routine-1', routineTitle: '朝の集中ルーティン', supportCount: 3 }],
  listBlockedAccounts: async () => [],
  listLikes: async () => [likedPost],
  listPosts: async () => [firstPost],
};

const secondPost = {
  accountId: '11111111-1111-4111-8111-111111111111',
  authorName: '山田 由紀',
  createdAt: '2026-09-04T00:00:00.000Z',
  customizations: 1,
  durationMinutes: 20,
  executions: 2,
  id: 'post-3',
  liked: false,
  likes: 4,
  routineId: 'routine-3',
  steps: [{ action: '読書', durationMinutes: 20 }],
  supports: 2,
  tags: ['読書'],
  title: '夜の読書ルーティン',
};

function Location() {
  return <output>{useLocation().pathname}</output>;
}

function renderPage(accountService: AccountService = service, blockService?: AccountBlockService) {
  return render(<MemoryRouter><AccountPage blockService={blockService} service={accountService} /><Location /></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('AccountPage', () => {
  it('初期表示でいいねとブロック中を取得し、それぞれの件数を表示する', async () => {
    const listLikesPage = vi.fn().mockResolvedValue({ items: [likedPost], total: 4 });
    const listBlockedAccounts = vi.fn().mockResolvedValue([
      { accountIdentifier: '22222222-2222-4222-8222-222222222222', bio: null, name: 'ブロック中のアカウント' },
      { accountIdentifier: '33333333-3333-4333-8333-333333333333', bio: null, name: 'もう一人のブロック中アカウント' },
    ]);
    renderPage({ ...service, listBlockedAccounts, listLikesPage });

    await screen.findByRole('heading', { name: '山田 由紀' });

    await waitFor(() => expect(listLikesPage).toHaveBeenCalledWith(1));
    await waitFor(() => expect(listBlockedAccounts).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('tab', { name: '4いいね' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '2ブロック中' })).toBeInTheDocument();
  });

  it('プロフィールと投稿を表示し、投稿からルーティン詳細へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('アカウント情報を読み込んでいます…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '山田 由紀' })).toBeInTheDocument();
    expect(document.querySelector('.account-avatar__image')).toHaveAttribute('src', 'https://example.com/icons/yamada.webp');
    expect(document.querySelector('.routine-card__avatar .account-avatar__image')).toHaveAttribute('src', 'https://example.com/icons/post-author.webp');
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.queryByText('11111111-1111-4111-8111-111111111111')).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['1投稿', '1いいね', '1実行履歴', '0ブロック中']);

    await user.click(screen.getByRole('link', { name: '朝の集中ルーティン' }));
    expect(screen.getByText('/routines/routine-1')).toBeInTheDocument();
  });

  it('投稿といいねのページを末尾へ追加し、タブごとの一覧を保持する', async () => {
    const user = userEvent.setup();
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
    const listPostsPage = vi.fn()
      .mockResolvedValueOnce({ items: [firstPost], total: 2 })
      .mockResolvedValueOnce({ items: [secondPost], total: 2 });
    const listLikesPage = vi.fn().mockResolvedValue({ items: [likedPost], total: 1 });
    renderPage({ ...service, listPostsPage, listLikesPage });

    await screen.findByRole('heading', { name: '山田 由紀' });
    await screen.findByRole('heading', { name: '朝の集中ルーティン' });
    await waitFor(() => expect(listLikesPage).toHaveBeenCalledTimes(1));
    notifyIntersection?.();
    expect(await screen.findByRole('heading', { name: '夜の読書ルーティン' })).toBeInTheDocument();
    notifyIntersection?.();
    await waitFor(() => expect(listPostsPage).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('tab', { name: /いいね/ }));
    expect(await screen.findByRole('heading', { name: '夜の読書ルーティン' })).toBeInTheDocument();
    expect(listLikesPage).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('tab', { name: /投稿/ }));
    expect(screen.getByRole('heading', { name: '夜の読書ルーティン' })).toBeInTheDocument();
    expect(listPostsPage).toHaveBeenCalledTimes(2);
  });

  it('次ページ取得エラー時も既存投稿を保持し、再試行できる', async () => {
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
    const listPostsPage = vi.fn()
      .mockResolvedValueOnce({ items: [firstPost], total: 2 })
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ items: [secondPost], total: 2 });
    renderPage({ ...service, listPostsPage });

    await screen.findByRole('heading', { name: '朝の集中ルーティン' });
    notifyIntersection?.();
    expect(await screen.findByText('アカウント情報を読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '朝の集中ルーティン' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('heading', { name: '夜の読書ルーティン' })).toBeInTheDocument();
    expect(listPostsPage).toHaveBeenCalledTimes(3);
  });

  it('いいねタブで API 由来の一覧を表示し、ルーティン詳細へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: '山田 由紀' });

    await user.click(screen.getByRole('tab', { name: /いいね/ }));
    expect(await screen.findByText('夜の読書ルーティン')).toBeInTheDocument();
    expect(screen.getByText('田中 陽介')).toBeInTheDocument();
    expect(document.querySelector('.routine-card__avatar .account-avatar__image')).toHaveAttribute('src', 'https://example.com/icons/liked-author.webp');

    await user.click(screen.getByRole('link', { name: '夜の読書ルーティン' }));
    expect(screen.getByText('/routines/routine-2')).toBeInTheDocument();
  });

  it('いいね API のエラー状態を表示する', async () => {
    const user = userEvent.setup();
    renderPage({ ...service, listLikes: vi.fn().mockRejectedValue(new Error('failed')) });
    await screen.findByRole('heading', { name: '山田 由紀' });

    await user.click(screen.getByRole('tab', { name: /いいね/ }));
    expect(await screen.findByText('いいねしたルーティンを読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
  });


  it('ブロック中タブで取得エラーを表示する', async () => {
    const user = userEvent.setup();
    renderPage({ ...service, listBlockedAccounts: vi.fn().mockRejectedValue(new Error('failed')) });
    await screen.findByRole('heading', { name: '山田 由紀' });

    await user.click(screen.getByRole('tab', { name: /ブロック中/ }));
    expect(await screen.findByText('ブロック中のアカウントを読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
  });

  it('ブロック中のアカウントを即時に一覧から削除する', async () => {
    const user = userEvent.setup();
    const blockedAccount = { accountIdentifier: '22222222-2222-4222-8222-222222222222', bio: 'ブロック中です', iconImageUrl: 'https://example.com/icons/blocked-account.webp', name: 'ブロック中のアカウント' };
    let resolveRemove: () => void = () => {};
    const blockService: AccountBlockService = {
      create: vi.fn(),
      remove: vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveRemove = resolve; })),
    };
    renderPage({ ...service, listBlockedAccounts: async () => [blockedAccount] }, blockService);
    await screen.findByRole('heading', { name: '山田 由紀' });

    await user.click(screen.getByRole('tab', { name: /ブロック中/ }));
    await screen.findByText('ブロック中のアカウント');
    const unblockButton = screen.getByRole('button', { name: 'ブロック解除' });
    expect(unblockButton.closest('a')).toBeNull();
    expect(unblockButton).toHaveClass('account-relation-card-with-action__button');
    expect(unblockButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    const blockedAccountLink = screen.getByRole('link', { name: 'ブロック中のアカウント' });
    expect(blockedAccountLink).toHaveClass('account-relation-card');
    expect(blockedAccountLink.closest('.account-relation-card-with-action')).toContainElement(unblockButton);
    expect(blockedAccountLink.querySelector('.account-avatar__image')).toHaveAttribute('src', 'https://example.com/icons/blocked-account.webp');

    await user.click(unblockButton);

    expect(blockService.remove).toHaveBeenCalledWith(blockedAccount.accountIdentifier);
    expect(screen.queryByText('ブロック中のアカウント')).not.toBeInTheDocument();

    resolveRemove();
    await waitFor(() => expect(screen.getByText('ブロック中のアカウントはまだありません')).toBeInTheDocument());
  });

  it('ブロック解除が失敗したときに対象を復元してエラーを表示する', async () => {
    const user = userEvent.setup();
    const blockedAccount = { accountIdentifier: '22222222-2222-4222-8222-222222222222', bio: null, name: 'ブロック中のアカウント' };
    const blockService: AccountBlockService = { create: vi.fn(), remove: vi.fn().mockRejectedValue(new Error('failed')) };
    renderPage({ ...service, listBlockedAccounts: async () => [blockedAccount] }, blockService);
    await screen.findByRole('heading', { name: '山田 由紀' });
    await user.click(screen.getByRole('tab', { name: /ブロック中/ }));
    await screen.findByText('ブロック中のアカウント');

    await user.click(screen.getByRole('button', { name: 'ブロック解除' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ブロックを解除できませんでした。時間をおいて再試行してください。');
    expect(screen.getByText('ブロック中のアカウント')).toBeInTheDocument();
  });

  it('ブロック解除が401なら認証状態を削除してログインへ遷移する', async () => {
    const user = userEvent.setup();
    const blockedAccount = { accountIdentifier: '22222222-2222-4222-8222-222222222222', bio: null, name: 'ブロック中のアカウント' };
    const blockService: AccountBlockService = { create: vi.fn(), remove: vi.fn().mockRejectedValue(new AccountBlockUnauthorizedError()) };
    markAuthenticated();
    renderPage({ ...service, listBlockedAccounts: async () => [blockedAccount] }, blockService);
    await screen.findByRole('heading', { name: '山田 由紀' });
    await user.click(screen.getByRole('tab', { name: /ブロック中/ }));
    await screen.findByText('ブロック中のアカウント');

    await user.click(screen.getByRole('button', { name: 'ブロック解除' }));

    await waitFor(() => expect(screen.getByText('/login')).toBeInTheDocument());
    expect(isAuthenticated()).toBe(false);
  });

  it('実行履歴タブにAPI由来の実行内容を表示する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: '山田 由紀' });

    await user.click(screen.getByRole('tab', { name: /実行履歴/ }));
    expect(screen.getByText('集中できました')).toBeInTheDocument();
    expect(screen.getByText('達成項目数')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('応援')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('実行履歴を選択すると対応する実行詳細画面へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: '山田 由紀' });

    await user.click(screen.getByRole('tab', { name: /実行履歴/ }));
    await user.click(screen.getByRole('button', { name: '朝の集中ルーティン' }));

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

  it('アカウントヘッダーのタイトルと設定ボタンを表示し、設定画面へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: '山田 由紀' });

    const settingsButton = screen.getByRole('button', { name: '設定' });
    const header = settingsButton.closest('header');
    expect(header).toHaveClass('account-page__header--own');
    expect(header).toContainElement(screen.getByRole('heading', { name: 'アカウント' }));

    await user.click(settingsButton);

    expect(screen.getByText('/account/settings')).toBeInTheDocument();
  });
});
