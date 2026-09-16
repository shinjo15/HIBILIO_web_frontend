import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileEditPage } from './ProfileEditPage';
import { ProfileEditUnauthorizedError, type ProfileEditService } from '../services/profileEditService';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';

function Location() {
  return <output>{useLocation().pathname}</output>;
}

function renderPage(service: ProfileEditService) {
  return render(<MemoryRouter><ProfileEditPage service={service} /><Location /></MemoryRouter>);
}

const editableProfile = {
  accountIdentifier: '11111111-1111-4111-8111-111111111111',
  bio: 'APIから読み込んだ自己紹介',
  favoriteTags: [{ identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '朝活' }],
  headerImage: null,
  headerImageUrl: 'https://example.com/headers/account.webp',
  iconImage: null,
  iconImageUrl: 'https://example.com/icons/account.webp',
  name: 'ログインアカウント',
  socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/example' }],
  uiMode: 'system' as const,
};

const service: ProfileEditService = {
  load: async () => ({
    ...editableProfile,
  }),
  loadTagCandidates: async () => [],
  save: async () => undefined,
};

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('ProfileEditPage', () => {
  it('編集用サービスから取得したプロフィールを表示し、ユーザーID入力を表示しない', async () => {
    renderPage(service);

    expect(await screen.findByDisplayValue('ログインアカウント')).toBeInTheDocument();
    expect(screen.getByLabelText('ヘッダーを変更').closest('.profile-edit__header-image')?.querySelector('img')).toHaveAttribute('src', 'https://example.com/headers/account.webp');
    expect(screen.getByLabelText('アイコンを変更').closest('.profile-edit__avatar')?.querySelector('img')).toHaveAttribute('src', 'https://example.com/icons/account.webp');
    expect(screen.getByDisplayValue('APIから読み込んだ自己紹介')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '朝活削除' })).toBeInTheDocument();
    expect(screen.queryByText('yuki_sleep')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ユーザーID')).not.toBeInTheDocument();
  });

  it('プロフィール取得が401なら認証状態を削除してログインへ遷移する', async () => {
    markAuthenticated();
    renderPage({ ...service, load: async () => { throw new ProfileEditUnauthorizedError(); } });

    await waitFor(() => expect(screen.getByText('/login')).toBeInTheDocument());
    expect(isAuthenticated()).toBe(false);
  });

  it('プロフィール取得が401以外で失敗すると読み込みエラーを表示する', async () => {
    renderPage({ ...service, load: async () => { throw new Error('Network error'); } });

    expect(await screen.findByText('プロフィールを読み込めませんでした。')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('保存すると編集済みプロフィールをサービスへ渡してアカウント画面へ遷移する', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    renderPage({ ...service, save });

    await screen.findByDisplayValue('ログインアカウント');
    await user.click(screen.getAllByRole('button', { name: '保存' })[0]);

    expect(save).toHaveBeenCalledWith(editableProfile);
    expect(await screen.findByText('/account')).toBeInTheDocument();
  });

  it('選択したアイコン・ヘッダー画像をプレビューし、保存対象へ含める', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    const icon = new File(['icon'], 'icon.png', { type: 'image/png' });
    const header = new File(['header'], 'header.webp', { type: 'image/webp' });
    renderPage({ ...service, save });

    await screen.findByDisplayValue('ログインアカウント');
    await user.upload(screen.getByLabelText('ヘッダーを変更'), header);
    await user.upload(screen.getByLabelText('アイコンを変更'), icon);

    expect(screen.getByLabelText('ヘッダーを変更').closest('.profile-edit__header-image')?.querySelector('img')).toHaveAttribute('src', expect.stringContaining('blob:'));
    expect(screen.getByLabelText('アイコンを変更').closest('.profile-edit__avatar')?.querySelector('img')).toHaveAttribute('src', expect.stringContaining('blob:'));
    await user.click(screen.getAllByRole('button', { name: '保存' })[0]);
    expect(save).toHaveBeenCalledWith({ ...editableProfile, headerImage: header, iconImage: icon });
  });

  it('保存が401なら認証状態を削除してログインへ遷移する', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    renderPage({ ...service, save: async () => { throw new ProfileEditUnauthorizedError(); } });

    await screen.findByDisplayValue('ログインアカウント');
    await user.click(screen.getAllByRole('button', { name: '保存' })[0]);

    await waitFor(() => expect(screen.getByText('/login')).toBeInTheDocument());
    expect(isAuthenticated()).toBe(false);
  });
});
