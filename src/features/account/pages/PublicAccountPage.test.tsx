import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicAccountPage } from './PublicAccountPage';
import { createPublicAccountService, type PublicAccountService } from '../services/publicAccountService';
import type { AccountBlockService } from '../services/accountBlockService';
import { AccountFollowError, AccountFollowUnauthorizedError, type AccountFollowService } from '../services/accountFollowService';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

function renderPage(service: PublicAccountService, path = '/accounts/account-1', blockService?: AccountBlockService, followService?: AccountFollowService) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicAccountPage blockService={blockService} followService={followService} service={service} />} path="/accounts/:accountId" />
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
    expect(screen.getByRole('button', { name: 'ブロック' })).toBeInTheDocument();
    expect(screen.getByText('朝の習慣を続けています。')).toBeInTheDocument();
    expect(screen.getByText('朝活')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /example/ })).toHaveAttribute('href', 'https://x.com/example');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['0投稿', '-いいね', '0実行履歴']);
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

    await user.click(screen.getByRole('button', { name: 'ブロック' }));

    expect(blockService.create).toHaveBeenCalledWith('account-1');
    expect(screen.getByRole('button', { name: 'ブロック済み' })).toBeDisabled();
  });

  it('フォロー成功時に対象アカウントをフォロー中として表示する', async () => {
    const user = userEvent.setup();
    const followService: AccountFollowService = { create: vi.fn().mockResolvedValue(undefined) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', undefined, followService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'フォロー' }));

    expect(followService.create).toHaveBeenCalledWith('account-1');
    expect(screen.getByRole('button', { name: 'フォロー中' })).toBeDisabled();
  });

  it('フォロー要求中はボタンを無効化する', async () => {
    const user = userEvent.setup();
    let resolveFollow: () => void = () => {};
    const followService: AccountFollowService = { create: vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveFollow = resolve; })) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', undefined, followService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'フォロー' }));

    expect(screen.getByRole('button', { name: 'フォローしています…' })).toBeDisabled();
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

    expect(await screen.findByRole('button', { name: 'フォロー中' })).toBeDisabled();
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
