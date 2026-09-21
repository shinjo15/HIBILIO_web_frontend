import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicAccountPage } from './PublicAccountPage';
import { createPublicAccountService, type PublicAccountService } from '../services/publicAccountService';
import type { AccountBlockService } from '../services/accountBlockService';
import type { AccountService } from '../services/accountService';
import { AccountFollowError, AccountFollowUnauthorizedError, type AccountFollowService } from '../services/accountFollowService';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';

const publicPost = { accountId: 'account-1', authorName: '公開アカウント', createdAt: '2026-09-03T12:00:00.000Z', customizations: 0, durationMinutes: 20, executions: 1, iconImageUrl: 'https://example.com/icons/public-post-author.webp', id: 'post-1', liked: false, likes: 2, routineId: 'routine-1', steps: [{ action: '集中', durationMinutes: 20 }], supports: 0, tags: [], title: '公開1' };

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

function renderPage(service: PublicAccountService, path = '/accounts/account-1', blockService?: AccountBlockService, followService?: AccountFollowService, currentAccountService: Pick<AccountService, 'getProfile'> = { getProfile: async () => null }) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicAccountPage blockService={blockService} currentAccountService={currentAccountService} followService={followService} service={service} />} path="/accounts/:accountId" />
        <Route element={<Location />} path="/login" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicAccountPage', () => {
  it('公開プロフィールのルートで、APIが返したプロフィール項目だけを表示する', async () => {
    const service = createPublicAccountService({ get: async () => ({
      account_bio: '朝の習慣を続けています。',
      account_identifier: 'account-1',
      account_name: '公開アカウント',
      favorite_tags: [{ tag_identifier: 'tag-1', tag_name: '朝活' }],
      social_links: [{ social_type: 'x', social_url: 'https://x.com/example' }],
    }) });

    renderPage(service);

    expect(await screen.findByRole('heading', { name: '公開アカウント' })).toBeInTheDocument();
    const backButton = screen.getByRole('button', { name: '戻る' });
    expect(backButton).toBeInTheDocument();
    expect(backButton.closest('header')).toHaveClass('account-page__header--public');
    expect(screen.getByRole('button', { name: 'フォロー' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ブロック' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アカウントのメニュー' })).toBeInTheDocument();
    expect(screen.getByText('朝の習慣を続けています。')).toBeInTheDocument();
    expect(screen.getByText('朝活')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /example/ })).toHaveAttribute('href', 'https://x.com/example');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['0投稿', '0いいね', '0実行履歴']);
  });

  it('初期表示でいいね一覧を取得し、API totalと現在の閲覧者基準の liked を表示する', async () => {
    const user = userEvent.setup();
    const likedByAccountOwner = { ...publicPost, liked: false, title: '公開アカウントがいいねした投稿' };
    const listLikesPage = vi.fn().mockResolvedValue({ items: [likedByAccountOwner], total: 4 });
    const service: PublicAccountService = {
      get: async () => ({ accountIdentifier: 'account-1', bio: null, favoriteTags: [], initial: '公', name: '公開アカウント', socialLinks: [] }),
      listExecutionHistories: async () => [],
      listLikes: async () => [],
      listLikesPage,
      listPosts: async () => [],
    };

    renderPage(service);

    await screen.findByRole('heading', { name: '公開アカウント' });
    await waitFor(() => expect(listLikesPage).toHaveBeenCalledWith('account-1', 1));
    expect(screen.getByRole('tab', { name: '4いいね' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '4いいね' }));

    expect(await screen.findByRole('heading', { name: '公開アカウントがいいねした投稿' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'いいねする' })).toBeInTheDocument();
  });

  it('ログイン中の自分の公開プロフィールではフォロー・ブロック操作を表示しない', async () => {
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '自分', favorite_tags: [], social_links: [] }) });
    const currentAccountService: Pick<AccountService, 'getProfile'> = {
      getProfile: async () => ({ accountIdentifier: 'account-1', bio: null, favoriteTags: [], initial: '自', name: '自分', socialLinks: [] }),
    };

    renderPage(service, '/accounts/account-1', undefined, undefined, currentAccountService);

    expect(await screen.findByRole('heading', { name: '自分' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'フォロー' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'アカウントのメニュー' })).not.toBeInTheDocument();
  });

  it('ログイン中アカウントの取得に失敗してもフォロー・ブロック操作を表示しない', async () => {
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '自分', favorite_tags: [], social_links: [] }) });
    const currentAccountService: Pick<AccountService, 'getProfile'> = { getProfile: async () => { throw new Error('network failure'); } };

    renderPage(service, '/accounts/account-1', undefined, undefined, currentAccountService);

    await screen.findByRole('heading', { name: '自分' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'フォロー' })).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'アカウントのメニュー' })).not.toBeInTheDocument();
  });

  it('公開投稿のページを末尾へ追加する', async () => {
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
      .mockResolvedValueOnce({ items: [{ ...publicPost, title: '公開1' }], total: 2 })
      .mockResolvedValueOnce({ items: [{ ...publicPost, id: 'post-2', title: '公開2' }], total: 2 });
    const service: PublicAccountService = {
      get: async () => ({ accountIdentifier: 'account-1', bio: null, favoriteTags: [], initial: '公', name: '公開アカウント', socialLinks: [] }),
      listExecutionHistories: async () => [],
      listLikes: async () => [],
      listPosts: async () => [],
      listPostsPage,
    };
    renderPage(service);

    await screen.findByRole('heading', { name: '公開1' });
    expect(document.querySelector('.routine-card__avatar .account-avatar__image')).toHaveAttribute('src', 'https://example.com/icons/public-post-author.webp');
    notifyIntersection?.();
    expect(await screen.findByRole('heading', { name: '公開2' })).toBeInTheDocument();
    expect(listPostsPage).toHaveBeenNthCalledWith(1, 'account-1', 1);
    expect(listPostsPage).toHaveBeenNthCalledWith(2, 'account-1', 2);
  });

  it('非表示または存在しない公開アカウントの状態を表示する', async () => {
    renderPage(createPublicAccountService({ get: async () => null }));

    expect(await screen.findByText('アカウントが見つかりませんでした。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument();
  });

  it('ブロック成功時に対象アカウントをブロック済みとして表示する', async () => {
    const user = userEvent.setup();
    const blockService: AccountBlockService = { create: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', blockService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'アカウントのメニュー' }));
    await user.click(screen.getByRole('menuitem', { name: 'ブロック' }));

    expect(blockService.create).toHaveBeenCalledWith('account-1');
    await user.click(screen.getByRole('button', { name: 'アカウントのメニュー' }));
    expect(screen.getByRole('menuitem', { name: 'ブロック済み' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('三点メニューからアカウント通報フォームを開く', async () => {
    const user = userEvent.setup();
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'アカウントのメニュー' }));
    await user.click(screen.getByRole('menuitem', { name: '通報' }));

    expect(screen.getByRole('heading', { name: 'このアカウントを通報' })).toBeInTheDocument();
  });

  it('フォロー成功時に対象アカウントをフォロー中として表示する', async () => {
    const user = userEvent.setup();
    const followService: AccountFollowService = { create: vi.fn().mockResolvedValue(undefined) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', undefined, followService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'フォロー' }));

    expect(followService.create).toHaveBeenCalledWith('account-1');
    const followButton = screen.getByRole('button', { name: 'フォロー中' });
    expect(followButton).toHaveClass('account-page__follow--followed');
    expect(followButton).toBeDisabled();
  });

  it('フォロー要求中はボタンを無効化する', async () => {
    const user = userEvent.setup();
    let resolveFollow: () => void = () => {};
    const followService: AccountFollowService = { create: vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveFollow = resolve; })) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', undefined, followService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'フォロー' }));

    const followButton = screen.getByRole('button', { name: 'フォローしています…' });
    expect(followButton).not.toHaveClass('account-page__follow--followed');
    expect(followButton).toBeDisabled();
    resolveFollow();
    expect(await screen.findByRole('button', { name: 'フォロー中' })).toBeDisabled();
  });

  it('重複フォロー時も対象アカウントをフォロー中として表示する', async () => {
    const user = userEvent.setup();
    const followService: AccountFollowService = { create: vi.fn().mockRejectedValue(new AccountFollowError('duplicate', 409)) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', undefined, followService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'フォロー' }));

    const followButton = await screen.findByRole('button', { name: 'フォロー中' });
    expect(followButton).toHaveClass('account-page__follow--followed');
    expect(followButton).toBeDisabled();
  });

  it('フォローが401なら認証状態を削除してログインへ遷移する', async () => {
    const user = userEvent.setup();
    const followService: AccountFollowService = { create: vi.fn().mockRejectedValue(new AccountFollowUnauthorizedError()) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    markAuthenticated();
    renderPage(service, '/accounts/account-1', undefined, followService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'フォロー' }));

    expect(await screen.findByText('/login')).toBeInTheDocument();
    expect(isAuthenticated()).toBe(false);
  });

  it('フォローに失敗したときにエラーを表示する', async () => {
    const user = userEvent.setup();
    const followService: AccountFollowService = { create: vi.fn().mockRejectedValue(new AccountFollowError('failed', 422)) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', undefined, followService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'フォロー' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('アカウントをフォローできませんでした。時間をおいて再試行してください。');
  });

  it('遷移元へ戻る', async () => {
    const user = userEvent.setup();
    const service = createPublicAccountService({ get: async () => ({
      account_bio: null,
      account_identifier: 'account-1',
      account_name: '公開アカウント',
      favorite_tags: [],
      social_links: [],
    }) });

    render(
      <MemoryRouter initialEntries={['/routines/routine-1', '/accounts/account-1']} initialIndex={1}>
        <Routes>
          <Route element={<Location />} path="/routines/:routineId" />
          <Route element={<PublicAccountPage service={service} />} path="/accounts/:accountId" />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '公開アカウント' });
    await user.click(screen.getByRole('button', { name: '戻る' }));

    expect(screen.getByText('/routines/routine-1')).toBeInTheDocument();
  });
});

function Location() {
  return <output>{useLocation().pathname}</output>;
}
