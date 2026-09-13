import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicAccountPage } from './PublicAccountPage';
import { createPublicAccountService, type PublicAccountService } from '../services/publicAccountService';
import type { AccountBlockService } from '../services/accountBlockService';

afterEach(() => cleanup());

function renderPage(service: PublicAccountService, path = '/accounts/account-1', blockService?: AccountBlockService) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicAccountPage blockService={blockService} service={service} />} path="/accounts/:accountId" />
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
    expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument();
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
    const blockService: AccountBlockService = { create: vi.fn().mockResolvedValue(undefined) };
    const service = createPublicAccountService({ get: async () => ({ account_bio: null, account_identifier: 'account-1', account_name: '公開アカウント', favorite_tags: [], social_links: [] }) });
    renderPage(service, '/accounts/account-1', blockService);
    await screen.findByRole('heading', { name: '公開アカウント' });

    await user.click(screen.getByRole('button', { name: 'ブロック' }));

    expect(blockService.create).toHaveBeenCalledWith('account-1');
    expect(screen.getByRole('button', { name: 'ブロック済み' })).toBeDisabled();
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
