import { useTheme } from '@mui/material';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppThemeProvider } from './AppThemeProvider';
import { useAppTheme } from './appThemeContext';
import { getAuthenticationStatus, markAuthenticated, resetAuthenticationForTesting } from '../features/auth/services/authSession';
import { resetUiModeServiceForTesting } from './uiModeService';

function ThemeControls() {
  const { isUiModeSaving, setUiMode, uiMode, uiModeError } = useAppTheme();
  const theme = useTheme();

  return (
    <>
      <output>{uiMode}</output>
      <output>{theme.palette.mode}</output>
      {uiModeError && <div role="alert">テーマの保存に失敗しました。</div>}
      <button disabled={isUiModeSaving} onClick={() => void setUiMode('dark')} type="button">ダーク</button>
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
  it('テーマ取得の401では認証状態を破棄し、前のアカウント設定を残さない', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    markAuthenticated();

    render(<AppThemeProvider><ThemeControls /></AppThemeProvider>);

    await waitFor(() => expect(getAuthenticationStatus()).toBe('unauthenticated'));
    expect(screen.getAllByText('system')[0]).toBeInTheDocument();
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
