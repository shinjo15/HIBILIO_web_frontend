import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileEditPage } from './ProfileEditPage';
import { ProfileEditUnauthorizedError, type ProfileEditService } from '../services/profileEditService';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';

function Location() {
  return <output>{useLocation().pathname}</output>;
}

function renderPage(service: ProfileEditService) {
  return render(<MemoryRouter><ProfileEditPage service={service} /><Location /></MemoryRouter>);
}

const service: ProfileEditService = {
  load: async () => ({
    accountIdentifier: '11111111-1111-4111-8111-111111111111',
    bio: 'APIから読み込んだ自己紹介',
    favoriteTags: [{ identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '朝活' }],
    headerImageName: null,
    iconImageName: null,
    name: 'ログインアカウント',
    socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/example' }],
    uiMode: 'system',
  }),
};

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('ProfileEditPage', () => {
  it('編集用サービスから取得したプロフィールを表示し、ユーザーID入力を表示しない', async () => {
    renderPage(service);

    expect(await screen.findByDisplayValue('ログインアカウント')).toBeInTheDocument();
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
});
