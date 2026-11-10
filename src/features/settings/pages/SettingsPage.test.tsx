import { useTheme } from '@mui/material';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppThemeProvider } from '../../../app/AppThemeProvider';
import { clearAuthenticated, getAuthenticationStatus, markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import { resetAccountVisibilityServiceForTesting } from '../services/accountVisibilityService';
import { resetLikeNotificationServiceForTesting } from '../services/likeNotificationService';
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

function accountResponse(
  visibility: 'private' | 'public',
  uiMode: 'dark' | 'light' | 'system' = 'system',
  likeNotificationsEnabled = false,
  supportNotificationsEnabled = false,
): Response {
  return new Response(JSON.stringify({
    account_bio: null,
    account_identifier: '11111111-1111-4111-8111-111111111111',
    account_name: 'ログインアカウント',
    favorite_tags: [],
    header_image_url: null,
    icon_image_url: null,
    like_notifications_enabled: likeNotificationsEnabled,
    social_links: [],
    support_notifications_enabled: supportNotificationsEnabled,
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
  resetLikeNotificationServiceForTesting();
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('SettingsPage', () => {
  it('通知設定の取得中は保存済みOFFに見えるスイッチを描画せず、読み込み表示にする', async () => {
    let resolveAccount: (response: Response) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveAccount = resolve;
    })));
    renderPage();

    expect(screen.getByText('通知設定を読み込んでいます。')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('switch', { name: 'いいね通知' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '応援通知' })).not.toBeInTheDocument();

    resolveAccount(accountResponse('public', 'system', false, true));
  });

  it('古いbackendの通知fields欠落時も鍵アカウントは現在値のまま操作でき、通知だけ再試行表示にする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      account_bio: null,
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: 'ログインアカウント',
      favorite_tags: [],
      header_image_url: null,
      icon_image_url: null,
      social_links: [],
      ui_mode: 'system',
      visibility: 'private',
    }), { status: 200 })));
    renderPage();

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: true })).toBeEnabled();
    expect(screen.getByText('通知設定を読み込めませんでした。時間をおいて再試行してください。').closest('[role="alert"]')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'いいね通知' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '応援通知' })).not.toBeInTheDocument();
  });

  it('通知取得が401なら認証を破棄し、通知値を偽表示しない', async () => {
    markAuthenticated();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    renderPage();

    await waitFor(() => expect(getAuthenticationStatus()).toBe('unauthenticated'));
    expect(screen.queryByRole('switch', { name: 'いいね通知' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '応援通知' })).not.toBeInTheDocument();
    expect(screen.getByText('通知設定を読み込めませんでした。時間をおいて再試行してください。').closest('[role="alert"]')).toBeInTheDocument();
  });

  it('認証世代切替後に古い設定GETが401でも新しい認証を破棄しない', async () => {
    let resolveAccount: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveAccount = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    clearAuthenticated();
    markAuthenticated();
    resolveAccount(new Response(null, { status: 401 }));

    await waitFor(() => expect(getAuthenticationStatus()).toBe('authenticated'));
  });

  it('画面を開き直した後に古い本人取得が完了しても、通知の新しい値を上書きしない', async () => {
    const resolvers: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolvers.push(resolve);
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    cleanup();
    renderPage();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    resolvers[1](accountResponse('public', 'system', false, true));
    expect(await screen.findByRole('switch', { name: '応援通知', checked: true })).toBeEnabled();

    resolvers[0](accountResponse('public', 'system', false, false));
    await waitFor(() => expect(screen.getByRole('switch', { name: '応援通知' })).toHaveAttribute('aria-checked', 'true'));
  });

  it('いいね通知と応援通知をそれぞれ CSRF と Cookie 付き PATCH で保存し、再取得した成功値を表示する', async () => {
    const user = userEvent.setup();
    let likeNotificationsEnabled = false;
    let supportNotificationsEnabled = true;
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/my/account') return Promise.resolve(accountResponse('public', 'system', likeNotificationsEnabled, supportNotificationsEnabled));
      if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }));
      if (path === '/api/my/account/like-notifications') {
        likeNotificationsEnabled = JSON.parse(init?.body as string).like_notifications_enabled;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (path === '/api/my/account/support-notifications') {
        supportNotificationsEnabled = JSON.parse(init?.body as string).support_notifications_enabled;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const likeNotification = await screen.findByRole('switch', { name: 'いいね通知', checked: false });
    const supportNotification = await screen.findByRole('switch', { name: '応援通知', checked: true });

    expect(likeNotification).toBeEnabled();
    expect(supportNotification).toBeEnabled();

    await user.click(likeNotification);

    expect(await screen.findByRole('switch', { name: 'いいね通知', checked: true })).toBeEnabled();
    expect(supportNotification).toHaveAttribute('aria-checked', 'true');
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account/like-notifications', {
      body: JSON.stringify({ like_notifications_enabled: true }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
    await user.click(supportNotification);

    expect(await screen.findByRole('switch', { name: '応援通知', checked: false })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account/support-notifications', {
      body: JSON.stringify({ support_notifications_enabled: false }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
  });

  it('いいね通知の保存失敗時は再取得値を表示し、再試行で同じ値だけを保存する', async () => {
    const user = userEvent.setup();
    let likeNotificationsEnabled = false;
    let attempts = 0;
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/my/account') return Promise.resolve(accountResponse('public', 'system', likeNotificationsEnabled, true));
      if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }));
      if (path === '/api/my/account/like-notifications') {
        attempts += 1;
        if (attempts === 1) return Promise.resolve(new Response(null, { status: 503 }));
        likeNotificationsEnabled = JSON.parse(init?.body as string).like_notifications_enabled;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(await screen.findByRole('switch', { name: 'いいね通知', checked: false }));

    expect(await screen.findByText('いいね通知の変更に失敗しました。時間をおいて再試行してください。')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'いいね通知', checked: false })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '再試行' }));

    expect(await screen.findByRole('switch', { name: 'いいね通知', checked: true })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/my/account/like-notifications')).toHaveLength(2);
  });

  it('応援通知の保存失敗時は再取得値を表示し、再試行で同じ値だけを保存する', async () => {
    const user = userEvent.setup();
    let supportNotificationsEnabled = false;
    let attempts = 0;
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/my/account') return Promise.resolve(accountResponse('public', 'system', false, supportNotificationsEnabled));
      if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }));
      if (path === '/api/my/account/support-notifications') {
        attempts += 1;
        if (attempts === 1) return Promise.resolve(new Response(null, { status: 503 }));
        supportNotificationsEnabled = JSON.parse(init?.body as string).support_notifications_enabled;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(await screen.findByRole('switch', { name: '応援通知', checked: false }));

    expect(await screen.findByText('応援通知の変更に失敗しました。時間をおいて再試行してください。')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '応援通知', checked: false })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '再試行' }));

    expect(await screen.findByRole('switch', { name: '応援通知', checked: true })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/my/account/support-notifications')).toHaveLength(2);
  });

  it('いいね通知 PATCH が401なら認証を破棄し、応援通知は現在値のまま無効にする', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    const fetchMock = vi.fn((path: string) => {
      if (path === '/api/my/account') return Promise.resolve(accountResponse('public', 'system', false, true));
      if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }));
      if (path === '/api/my/account/like-notifications') return Promise.resolve(new Response(null, { status: 401 }));
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(await screen.findByRole('switch', { name: 'いいね通知', checked: false }));

    await waitFor(() => expect(getAuthenticationStatus()).toBe('unauthenticated'));
    expect(screen.getByRole('switch', { name: '応援通知', checked: true })).toBeDisabled();
  });

  it('いいね通知の保存中は連打を防ぎ、画面を開き直しても完了後の再取得値だけを表示する', async () => {
    const user = userEvent.setup();
    let likeNotificationsEnabled = false;
    let resolvePatch: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === '/api/my/account') return Promise.resolve(accountResponse('public', 'system', likeNotificationsEnabled, true));
      if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }));
      if (path === '/api/my/account/like-notifications') {
        expect(JSON.parse(init?.body as string)).toEqual({ like_notifications_enabled: true });
        return new Promise<Response>((resolve) => { resolvePatch = resolve; });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const likeNotification = await screen.findByRole('switch', { name: 'いいね通知', checked: false });
    await user.click(likeNotification);
    expect(likeNotification).toBeDisabled();
    await user.click(likeNotification);
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/my/account/like-notifications')).toHaveLength(1);

    cleanup();
    renderPage();
    likeNotificationsEnabled = true;
    resolvePatch(new Response(null, { status: 204 }));

    expect(await screen.findByRole('switch', { name: 'いいね通知', checked: true })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/my/account/like-notifications')).toHaveLength(1);
  });

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

    expect((await screen.findAllByRole('alert')).length).toBe(2);
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
        like_notifications_enabled: false,
        social_links: [],
        support_notifications_enabled: false,
        visibility: 'private',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(accountResponse('public'));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const privateAccount = await screen.findByRole('switch', { name: '鍵アカウント', checked: true });
    await user.click(privateAccount);

    expect(await screen.findByRole('switch', { name: '鍵アカウント', checked: false })).toBeEnabled();
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
        like_notifications_enabled: false,
        social_links: [],
        support_notifications_enabled: false,
        visibility: 'private',
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect((await screen.findAllByRole('alert')).length).toBe(2);
    expect(screen.getByRole('switch', { name: '鍵アカウント' })).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: '再試行' })[0]);

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
      like_notifications_enabled: false,
      social_links: [],
      support_notifications_enabled: false,
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
        like_notifications_enabled: false,
        social_links: [],
        support_notifications_enabled: false,
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
        like_notifications_enabled: false,
        social_links: [],
        support_notifications_enabled: false,
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
