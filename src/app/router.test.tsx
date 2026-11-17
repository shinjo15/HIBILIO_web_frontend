import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthenticated, markAuthenticated, resetAuthenticationForTesting } from '../features/auth/services/authSession';
import { router } from './router';

function flattenRoutes(routes: typeof router.routes): typeof router.routes {
  return routes.flatMap((route) => [route, ...flattenRoutes(route.children ?? [])]);
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  resetAuthenticationForTesting();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('router', () => {
  it('ホーム画面のルートを持つ', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'home')).toBe(true);
  });

  it('一覧専用のルートを持つ', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'feed')).toBe(true);
  });

  it('認証済みユーザー向けにお問い合わせ画面のルートを提供する', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'contact-support')).toBe(true);
  });

  it('認証済みユーザー向けに通知画面のルートを提供する', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'notifications')).toBe(true);
  });

  it('未認証時に未定義URLへ直接アクセスすると404画面からHomeへ遷移できる', async () => {
    clearAuthenticated();
    await router.navigate('/not-found');
    const user = userEvent.setup();

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Homeへ戻る' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'));
  });

  it('認証済み時にアプリ内遷移で未定義URLを開くと404画面からHomeへ遷移できる', async () => {
    markAuthenticated();
    await router.navigate('/login');
    const user = userEvent.setup();

    render(<RouterProvider router={router} />);
    await router.navigate('/not-found');

    expect(await screen.findByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Homeへ戻る' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'));
  });

  it('未認証時も実行詳細の保護ルートはログインへ誘導する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await router.navigate('/routines/routine-1/executions/execution-1');

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
