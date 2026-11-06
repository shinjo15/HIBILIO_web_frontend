import { useTheme } from '@mui/material';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppThemeProvider } from '../../../app/AppThemeProvider';
import { getAuthenticationStatus, markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import { resetAccountVisibilityServiceForTesting } from '../services/accountVisibilityService';
import { SettingsPage } from './SettingsPage';

function Location() {
  return <output>{useLocation().pathname}</output>;
}

function ThemeMode() {
  const theme = useTheme();
  return <output>{theme.palette.mode}</output>;
}

function renderPage() {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/account/settings']}>
        <SettingsPage />
        <Location />
        <ThemeMode />
      </MemoryRouter>
    </AppThemeProvider>,
  );
}

function accountResponse(visibility: 'private' | 'public', uiMode: 'dark' | 'light' | 'system' = 'system'): Response {
  return new Response(JSON.stringify({
    account_bio: null,
    account_identifier: '11111111-1111-4111-8111-111111111111',
    account_name: 'ログインアカウント',
    favorite_tags: [],
    header_image_url: null,
    icon_image_url: null,
    social_links: [],
    ui_mode: uiMode,
    visibility,
  }), { status: 200 });
}

function renderStrictPage() {
  return render(
    <StrictMode>
      <AppThemeProvider>
        <MemoryRouter initialEntries={['/account/settings']}>
          <SettingsPage />
          <Location />
          <ThemeMode />
        </MemoryRouter>
      </AppThemeProvider>
    </StrictMode>,
  );
}

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('hibilio-theme-dark');
  resetAccountVisibilityServiceForTesting();
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('SettingsPage', () => {
  it('StrictMode のeffect再setup後も公開範囲を保存して操作可能な状態へ戻す', async () => {
    const user = userEvent.setup();
    let visibility: 'private' | 'public' = 'public';
    const fetchMock = vi.fn((path: string) => {
      if (path === '/api/my/account') return Promise.resolve(accountResponse(visibility));
      if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }));
      visibility = 'private';
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderStrictPage();

    await user.click(await screen.findByRole('switch', { name: '鍵アカウント', checked: false }));

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();
  });

  it('PATCH の通信結果が不明な場合は再同期が確定するまで操作を無効化し、再同期値を表示する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('public'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockRejectedValueOnce(new TypeError('NetworkError'))
      .mockResolvedValueOnce(accountResponse('private'));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(await screen.findByRole('switch', { name: '鍵アカウント', checked: false }));

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('プロフィール取得が null の場合は公開範囲を不明として操作を無効化し再試行を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })));
    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '鍵アカウント' })).toBeDisabled();
  });

  it('公開範囲の取得が401なら既存の認証状態を破棄する', async () => {
    markAuthenticated();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    renderPage();

    await waitFor(() => expect(getAuthenticationStatus()).toBe('unauthenticated'));
  });

  it('公開範囲PATCHが401の場合も再同期後に既存の認証状態を破棄する', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('public'))
      .mockResolvedValueOnce(accountResponse('public'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(await screen.findByRole('switch', { name: '鍵アカウント', checked: false }));

    await waitFor(() => expect(getAuthenticationStatus()).toBe('unauthenticated'));
  });

  it('保存中に画面を開き直した場合は共通の保存完了を待ってから現在値を再取得する', async () => {
    const user = userEvent.setup();
    let resolvePatch: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('public'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePatch = resolve; }))
      .mockResolvedValueOnce(accountResponse('private'));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(await screen.findByRole('switch', { name: '鍵アカウント', checked: false }));
    cleanup();
    renderPage();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    resolvePatch(new Response(null, { status: 204 }));

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('現在の公開範囲を読み込み、CSRF と Cookie 付き PATCH 成功後の再同期値だけを鍵アカウント表示へ反映する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        account_bio: null,
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: 'ログインアカウント',
        favorite_tags: [],
        header_image_url: null,
        icon_image_url: null,
        social_links: [],
        visibility: 'private',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(accountResponse('public'));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const privateAccount = await screen.findByRole('switch', { name: '鍵アカウント', checked: true });
    const likeNotification = screen.getByRole('switch', { name: 'いいね通知' });
    const supportNotification = screen.getByRole('switch', { name: '応援通知' });

    expect(likeNotification).toHaveAttribute('aria-checked', 'true');
    expect(supportNotification).toHaveAttribute('aria-checked', 'true');

    await user.click(privateAccount);
    await user.click(likeNotification);
    await user.click(supportNotification);

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: false })).toBeEnabled();
    expect(likeNotification).toHaveAttribute('aria-checked', 'false');
    expect(supportNotification).toHaveAttribute('aria-checked', 'false');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/my/account', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/my/account/visibility', {
      body: JSON.stringify({ visibility: 'public' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
  });

  it('システム設定チェックを外すと表示中のOS実効テーマを保存し、ライト・ダーク2択を表示する', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('public', 'system'))
      .mockResolvedValueOnce(accountResponse('public'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(accountResponse('public', 'light'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(accountResponse('public', 'system'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const themeHeading = screen.getByRole('heading', { level: 3, name: 'テーマ' });
    const themePanel = themeHeading.parentElement;
    expect(themePanel).toHaveClass('settings-ui-mode');
    const systemSetting = await screen.findByRole('checkbox', { name: 'システム設定を利用する', checked: true });
    expect(systemSetting).toBeEnabled();
    expect(screen.getByText('システム設定を利用する')).toBeInTheDocument();
    expect(themePanel).toContainElement(systemSetting);
    expect(systemSetting.closest('label')).toHaveClass('settings-toggle', 'settings-toggle--checked', 'settings-ui-mode-system-toggle');
    systemSetting.focus();
    expect(systemSetting).toHaveFocus();
    expect(screen.queryByRole('radio', { name: 'ライト' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'ダーク' })).not.toBeInTheDocument();
    await user.click(systemSetting);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const uncheckedSystemSetting = await screen.findByRole('checkbox', { name: 'システム設定を利用する', checked: false });
    expect(uncheckedSystemSetting).toBeEnabled();
    expect(uncheckedSystemSetting.closest('label')).toHaveClass('settings-toggle', 'settings-ui-mode-system-toggle');
    expect(uncheckedSystemSetting.closest('label')).not.toHaveClass('settings-toggle--checked');
    expect(screen.getByRole('radio', { name: 'ライト', checked: true })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'ダーク', checked: false })).toBeEnabled();
    const themeOptions = screen.getByRole('radiogroup', { name: 'テーマ' });
    expect(themePanel).toContainElement(themeOptions);
    expect(themeOptions).toHaveClass('settings-ui-mode-options');
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account/ui-mode', {
      body: JSON.stringify({ ui_mode: 'light' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });

    await user.keyboard(' ');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
    expect(await screen.findByRole('checkbox', { name: 'システム設定を利用する', checked: true })).toBeEnabled();
    expect(screen.queryByRole('radio', { name: 'ライト' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/my/account', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account/ui-mode', {
      body: JSON.stringify({ ui_mode: 'system' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
  });

  it('テーマ保存エラー時は再同期値を表示して操作を無効化し、再試行後に選択可能に戻す', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('public', 'system'))
      .mockResolvedValueOnce(accountResponse('public'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(accountResponse('public', 'system'))
      .mockResolvedValueOnce(accountResponse('public', 'light'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: 'システム設定を利用する', checked: true }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'システム設定を利用する', checked: true })).toBeDisabled();
    expect(screen.queryByRole('radio', { name: 'ライト' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(5);

    await user.click(screen.getByRole('button', { name: '再試行' }));

    expect(await screen.findByRole('checkbox', { name: 'システム設定を利用する', checked: false })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'ライト', checked: true })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('公開範囲の保存失敗後も再同期値を表示する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('private'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(accountResponse('private'));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const privateAccount = await screen.findByRole('switch', { name: '鍵アカウント', checked: true });
    await user.click(privateAccount);

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('公開範囲の取得に失敗した場合はスイッチを無効化し、再試行で現在値を表示する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        account_bio: null,
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: 'ログインアカウント',
        favorite_tags: [],
        header_image_url: null,
        icon_image_url: null,
        social_links: [],
        visibility: 'private',
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '鍵アカウント' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '再試行' }));

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('公開範囲の取得中はスイッチを無効化する', async () => {
    let resolveProfile: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveProfile = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(screen.getByRole('switch', { name: '鍵アカウント' })).toBeDisabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    resolveProfile(new Response(JSON.stringify({
      account_bio: null,
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: 'ログインアカウント',
      favorite_tags: [],
      header_image_url: null,
      icon_image_url: null,
      social_links: [],
      visibility: 'public',
    }), { status: 200 }));

    await waitFor(() => expect(screen.getByRole('switch', { name: '鍵アカウント' })).toBeEnabled());
  });

  it('送信中の重複操作を防ぎ、画面を開き直すとAPIの現在値を再取得する', async () => {
    const user = userEvent.setup();
    let resolvePatch: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        account_bio: null,
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: 'ログインアカウント',
        favorite_tags: [],
        header_image_url: null,
        icon_image_url: null,
        social_links: [],
        visibility: 'public',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolvePatch = resolve;
      }))
      .mockResolvedValueOnce(accountResponse('private'))
      .mockResolvedValueOnce(accountResponse('private'));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const privateAccount = await screen.findByRole('switch', { name: '鍵アカウント', checked: false });
    await user.click(privateAccount);
    expect(privateAccount).toBeDisabled();
    await user.click(privateAccount);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    resolvePatch(new Response(null, { status: 204 }));
    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();

    cleanup();
    renderPage();
    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('通常の設定ヘッダーに戻るボタンとタイトルを表示し、戻る操作で遷移する', async () => {
    const user = userEvent.setup();
    renderPage();

    const backButton = screen.getByRole('button', { name: 'アカウントに戻る' });
    const header = backButton.closest('header');
    expect(header).toHaveClass('settings-page__header');
    expect(header).toContainElement(screen.getByRole('heading', { name: '設定' }));

    await user.click(backButton);
    expect(screen.getByText('/account')).toBeInTheDocument();
  });

  it('ログアウトセクションにお問い合わせを表示し、選択するとお問い合わせ画面へ遷移する', async () => {
    const user = userEvent.setup();
    renderPage();

    const contactSupport = screen.getByRole('button', { name: 'お問い合わせ' });
    expect(contactSupport.closest('.settings-page__sign-out-section')).toBeInTheDocument();

    await user.click(contactSupport);
    expect(screen.getByText('/contact-support')).toBeInTheDocument();
  });

  it('CSRF と Cookie 付きのログアウト成功後にログインへ遷移する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        account_bio: null,
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: 'ログインアカウント',
        favorite_tags: [],
        header_image_url: null,
        icon_image_url: null,
        social_links: [],
        visibility: 'public',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(await screen.findByText('/login')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/logout', {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
  });

  it('対象外のアプリアイコン画面への導線を表示しない', () => {
    renderPage();

    expect(screen.queryByText('アプリアイコン')).not.toBeInTheDocument();
  });
});
