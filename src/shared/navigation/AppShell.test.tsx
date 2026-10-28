import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { markAuthenticated, resetAuthenticationForTesting } from '../../features/auth/services/authSession';
import { RoutineCreatePage } from '../../features/routineCreate/pages/RoutineCreatePage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  resetAuthenticationForTesting();
});

describe('AppShell', () => {
  it('モバイルナビを一覧、検索、作成、アカウント、空スロットの5等分で並べる', () => {
    const router = createMemoryRouter([
      { element: <AppShell />, children: [{ element: <h1>一覧画面</h1>, index: true }] },
    ]);

    render(<RouterProvider router={router} />);

    const mobileNav = document.querySelector('.hibilio-mobile-nav');
    expect(mobileNav).not.toBeNull();
    expect(Array.from(mobileNav!.children)).toHaveLength(5);
    expect(Array.from(mobileNav!.children).slice(0, 4).map((child) => child.getAttribute('aria-label'))).toEqual(['一覧', '検索', 'ルーティンを投稿', 'アカウント']);
    expect(mobileNav!.children[4]).toHaveAttribute('aria-hidden', 'true');
    expect(mobileNav!.children[4]).toHaveClass('hibilio-mobile-nav__spacer');
  });

  it('モバイルナビゲーションでアカウント画面へ遷移できる', async () => {
    markAuthenticated();
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [
          {
            element: <h1>一覧画面</h1>,
            index: true,
          },
          {
            element: <h1>アカウント画面</h1>,
            path: 'account',
          },
          {
            element: <h1>投稿画面</h1>,
            path: 'routines/new',
          },
        ],
      },
    ]);

    render(<RouterProvider router={router} />);

    await user.click(screen.getByRole('button', { name: 'アカウント' }));

    expect(screen.getByRole('heading', { name: 'アカウント画面' })).toBeInTheDocument();
  });

  it('PCサイドメニューとモバイルメニューの検索から公開検索画面へ遷移できる', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [
          { element: <h1>一覧画面</h1>, index: true },
          { element: <h1>検索画面</h1>, path: 'search' },
        ],
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getAllByRole('link', { name: '検索' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(screen.getByRole('heading', { name: '検索画面' })).toBeInTheDocument();
  });

  it('セッションマーカーがなくてもアカウント API が200ならアカウント画面へ遷移する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [
          { element: <h1>一覧画面</h1>, index: true },
          { element: <h1>アカウント画面</h1>, path: 'account' },
        ],
      },
      { element: <h1>ログイン画面</h1>, path: '/login' },
    ]);

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/my/account', {
      credentials: 'include',
      method: 'GET',
    }));
    await user.click(screen.getByRole('button', { name: 'アカウント' }));

    expect(screen.getByRole('heading', { name: 'アカウント画面' })).toBeInTheDocument();
  });

  it('セッションマーカーがなくアカウント API が401ならログイン画面へ遷移する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const router = createMemoryRouter([
      { element: <AppShell />, children: [{ element: <h1>一覧画面</h1>, index: true }] },
      { element: <h1>ログイン画面</h1>, path: '/login' },
    ]);

    render(<RouterProvider router={router} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/my/account', {
      credentials: 'include',
      method: 'GET',
    }));
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/persistent-login/restore', {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    }));
    await user.click(screen.getByRole('button', { name: 'アカウント' }));
    expect(screen.getByRole('heading', { name: 'ログイン画面' })).toBeInTheDocument();
  });

  it('ルーティン投稿の送信中はモバイル投稿操作を無効化し、連打送信しない', async () => {
    const user = userEvent.setup();
    let resolveCreate: (() => void) | undefined;
    const create = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveCreate = resolve; }));
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [{ element: <RoutineCreatePage service={{ create }} />, path: 'routines/new' }],
      },
    ], { initialEntries: ['/routines/new'] });

    render(<RouterProvider router={router} />);
    await user.type(screen.getByLabelText(/ルーティン名/), '朝の習慣');
    await user.type(screen.getByPlaceholderText('行動の内容'), '水を飲む');
    const mobileSubmit = document.querySelector<HTMLButtonElement>('.hibilio-mobile-nav__create-trigger');
    expect(mobileSubmit).not.toBeNull();
    await waitFor(() => expect(mobileSubmit).toBeEnabled());

    await user.click(mobileSubmit!);
    expect(create).toHaveBeenCalledTimes(1);
    expect(mobileSubmit).toBeDisabled();
    expect(create).toHaveBeenCalledTimes(1);

    resolveCreate?.();
    expect(await screen.findByText('ルーティンを投稿しました。')).toBeInTheDocument();
  });
});
