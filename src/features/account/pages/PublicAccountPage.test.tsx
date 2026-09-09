import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicAccountPage } from './PublicAccountPage';
import { createPublicAccountService, type PublicAccountService } from '../services/publicAccountService';

afterEach(() => cleanup());

function renderPage(service: PublicAccountService, path = '/accounts/account-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicAccountPage service={service} />} path="/accounts/:accountId" />
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
    expect(screen.getByRole('heading', { name: '公開アカウント' }).closest('.account-profile__body')).toHaveClass('account-profile__body--without-actions');
    expect(screen.getByText('朝の習慣を続けています。')).toBeInTheDocument();
    expect(screen.getByText('朝活')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /example/ })).toHaveAttribute('href', 'https://x.com/example');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('非表示または存在しない公開アカウントの状態を表示する', async () => {
    renderPage(createPublicAccountService({ get: async () => null }));

    expect(await screen.findByText('アカウントが見つかりませんでした。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument();
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
