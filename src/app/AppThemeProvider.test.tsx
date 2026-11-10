import { useTheme } from '@mui/material';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppThemeProvider } from './AppThemeProvider';
import { useAppTheme } from './appThemeContext';
import { RequireAuthentication } from '../features/auth/components/RequireAuthentication';
import { clearAuthenticated, getAuthenticationStatus, markAuthenticated, resetAuthenticationForTesting } from '../features/auth/services/authSession';
import { resetUiModeServiceForTesting } from './uiModeService';

function ThemeControls() {
  const { isUiModeLoading, isUiModeSaving, retryUiMode, setUiMode, uiMode, uiModeError } = useAppTheme();
  const theme = useTheme();

  return (
    <>
      <output>{uiMode ?? 'unconfirmed'}</output>
      <output>{theme.palette.mode}</output>
      {uiModeError && <div role="alert">テーマの保存に失敗しました。<button onClick={retryUiMode} type="button">再試行</button></div>}
      <button disabled={isUiModeLoading || isUiModeSaving || uiModeError} onClick={() => void setUiMode('dark')} type="button">ダーク</button>
    </>
  );
}

function accountResponse(uiMode: 'dark' | 'light' | 'system'): Response {
  return new Response(JSON.stringify({ ui_mode: uiMode }), { status: 200 });
}

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('hibilio-theme-dark');
  resetAuthenticationForTesting();
  resetUiModeServiceForTesting();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AppThemeProvider', () => {
  it('未認証時はOS設定にかかわらず従来どおりライトテーマを使用する', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() })));

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);

    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('初期テーマ取得に失敗した場合、未確認値を選択表示せず操作を無効化してエラーを表示する', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(accountResponse('light'));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('unconfirmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ダーク' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByText('light')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('認証済みStrictModeでもテーマ取得を共有し、確定するまで選択を無効化する', async () => {
    let resolveLoad: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveLoad = resolve; }));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<StrictMode><AppThemeProvider><ThemeControls /></AppThemeProvider></StrictMode>);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'ダーク' })).toBeDisabled();
    resolveLoad(accountResponse('dark'));
    await waitFor(() => expect(screen.getAllByText('dark')).toHaveLength(2));
  });

  it('別アカウントへの再ログイン中は前アカウントのテーマを確定表示しない', async () => {
    let resolveSecondLoad: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('dark'))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecondLoad = resolve; }));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);
    await waitFor(() => expect(screen.getAllByText('dark')).toHaveLength(2));
    clearAuthenticated();
    expect(await screen.findByText('unconfirmed')).toBeInTheDocument();
    markAuthenticated();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText('unconfirmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ダーク' })).toBeDisabled();
    resolveSecondLoad(accountResponse('light'));
    expect(await screen.findByText('light')).toBeInTheDocument();
  });

  it('別アカウントのログインは前アカウントの進行中GETを共有せず、古い応答を適用しない', async () => {
    let resolveFirstLoad: (response: Response) => void = () => undefined;
    let resolveSecondLoad: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirstLoad = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecondLoad = resolve; }));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    clearAuthenticated();
    expect(await screen.findByText('unconfirmed')).toBeInTheDocument();
    markAuthenticated();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolveSecondLoad(accountResponse('light'));
    await waitFor(() => expect(screen.getAllByText('light')).toHaveLength(2));
    resolveFirstLoad(accountResponse('dark'));
    await waitFor(() => expect(screen.getAllByText('light')).toHaveLength(2));
  });

  it('前アカウントのテーマGETが401でも、再ログイン済みの認証状態を破棄しない', async () => {
    let resolveFirstLoad: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirstLoad = resolve; }))
      .mockResolvedValueOnce(accountResponse('light'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    clearAuthenticated();
    markAuthenticated();
    await screen.findByText('light');

    resolveFirstLoad(new Response(null, { status: 401 }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(getAuthenticationStatus()).toBe('authenticated');
  });

  it('保存中にログアウトして別アカウントへログインしても、新アカウントの保存状態を無効化しない', async () => {
    let resolveFirstPatch: (response: Response) => void = () => undefined;
    let resolveSecondLoad: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('system'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirstPatch = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecondLoad = resolve; }));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);
    await screen.findByText('system');
    fireEvent.click(screen.getByRole('button', { name: 'ダーク' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    clearAuthenticated();
    expect(await screen.findByText('unconfirmed')).toBeInTheDocument();
    markAuthenticated();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    resolveSecondLoad(accountResponse('light'));
    expect(await screen.findByRole('button', { name: 'ダーク' })).toBeEnabled();
    resolveFirstPatch(new Response(null, { status: 204 }));
  });

  it('永続ログイン復元で認証が確定した後に、そのセッションのテーマを取得する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(accountResponse('dark'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter([
      { element: <RequireAuthentication />, children: [{ element: <ThemeControls />, index: true }] },
      { element: <p>ログイン</p>, path: '/login' },
    ]);

    render(<AppThemeProvider><RouterProvider router={router} /></AppThemeProvider>);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/my/account', { credentials: 'include', method: 'GET' });
    await waitFor(() => expect(screen.getAllByText('dark')).toHaveLength(2));
  });

  it('連続変更は一度だけ保存して一度だけ再同期する', async () => {
    let resolvePatch: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('system'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePatch = resolve; }))
      .mockResolvedValueOnce(accountResponse('dark'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);
    await screen.findByText('system');
    const dark = screen.getByRole('button', { name: 'ダーク' });
    fireEvent.click(dark);
    fireEvent.click(dark);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    resolvePatch(new Response(null, { status: 204 }));

    await waitFor(() => expect(screen.getAllByText('dark')).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('テーマ取得の401では認証状態を破棄し、前のアカウント設定を残さない', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);

    await waitFor(() => expect(getAuthenticationStatus()).toBe('unauthenticated'));
    expect(screen.getByText('unconfirmed')).toBeInTheDocument();
  });

  it('ログイン後に保存済みのsystem設定を取得し、OSの配色変更へ追随する', async () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const mediaQuery = { addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener), matches: false, removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener) } as unknown as MediaQueryList;
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(accountResponse('system')));
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);

    await waitFor(() => expect(screen.getAllByText('system')[0]).toBeInTheDocument());
    expect(screen.getAllByText('light')[0]).toBeInTheDocument();
    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    await waitFor(() => expect(screen.getAllByText('dark')[0]).toBeInTheDocument());
  });

  it('更新失敗または通信結果不明時はGET再同期値を表示し、利用者へ失敗を知らせる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accountResponse('system'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockRejectedValueOnce(new TypeError('NetworkError'))
      .mockResolvedValueOnce(accountResponse('light'));
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);
    await waitFor(() => expect(screen.getAllByText('system')[0]).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'ダーク' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByText('light')[0]).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
