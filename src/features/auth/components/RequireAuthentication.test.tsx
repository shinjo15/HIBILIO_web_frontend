import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RequireAuthentication } from './RequireAuthentication';
import { logout, markAuthenticated, resetAuthenticationForTesting } from '../services/authSession';

afterEach(() => {
  cleanup();
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('RequireAuthentication', () => {
  it('セッション判定中は既存の読み込み文言を表示する', () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter([
      { element: <RequireAuthentication />, children: [{ element: <h1>保護画面</h1>, index: true }] },
      { element: <h1>ログイン画面</h1>, path: '/login' },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByText('アカウント情報を読み込んでいます…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン画面' })).not.toBeInTheDocument();
  });

  it('セッション復元の判定が終わるまでログイン画面へ遷移しない', async () => {
    let resolveSessionCheck: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSessionCheck = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter([
      {
        element: <RequireAuthentication />,
        children: [{ element: <h1>保護画面</h1>, index: true }],
      },
      { element: <h1>ログイン画面</h1>, path: '/login' },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.queryByRole('heading', { name: 'ログイン画面' })).not.toBeInTheDocument();
    resolveSessionCheck(new Response(null, { status: 401 }));

    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/csrf-token', { credentials: 'include', method: 'GET' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'ログイン画面' })).toBeInTheDocument());
  });

  it('ログアウト成功後の再表示では保護ルートをログイン画面へ遷移する', async () => {
    markAuthenticated();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter([
      { element: <RequireAuthentication />, children: [{ element: <h1>保護画面</h1>, index: true }] },
      { element: <h1>ログイン画面</h1>, path: '/login' },
    ]);

    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { name: '保護画面' })).toBeInTheDocument();
    await logout();

    expect(await screen.findByRole('heading', { name: 'ログイン画面' })).toBeInTheDocument();
  });

  it('ログアウト失敗後の再表示では保護ルートを維持する', async () => {
    markAuthenticated();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter([
      { element: <RequireAuthentication />, children: [{ element: <h1>保護画面</h1>, index: true }] },
      { element: <h1>ログイン画面</h1>, path: '/login' },
    ]);

    render(<RouterProvider router={router} />);
    await expect(logout()).rejects.toThrow('Failed to logout');

    expect(screen.getByRole('heading', { name: '保護画面' })).toBeInTheDocument();
  });
});
