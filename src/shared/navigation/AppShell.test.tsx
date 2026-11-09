import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { markAuthenticated, resetAuthenticationForTesting } from '../../features/auth/services/authSession';
import { RoutineCreatePage } from '../../features/routineCreate/pages/RoutineCreatePage';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  resetAuthenticationForTesting();
});

describe('AppShell', () => {
  it('モバイルナビをHome、一覧、中央投稿、検索、アカウントの5等分で並べる', () => {
    const router = createMemoryRouter([
      { element: <AppShell />, children: [{ element: <h1>一覧画面</h1>, index: true }] },
    ]);

    render(<RouterProvider router={router} />);

    const mobileNav = document.querySelector('.hibilio-mobile-nav');
    expect(mobileNav).not.toBeNull();
    expect(Array.from(mobileNav!.children)).toHaveLength(5);
    expect(Array.from(mobileNav!.children).map((child) => child.getAttribute('aria-label'))).toEqual(['Home', '一覧', 'ルーティンを投稿', '検索', 'アカウント']);
    expect(document.querySelector('.hibilio-mobile-nav__spacer')).not.toBeInTheDocument();
  });

  it('HomeはHomeアイコン、一覧は一覧アイコンをPCとモバイルで表示する', () => {
    const router = createMemoryRouter([
      { element: <AppShell />, children: [{ element: <h1>一覧画面</h1>, index: true }] },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getAllByTestId('HomeOutlinedIcon')).toHaveLength(2);
    expect(screen.getAllByTestId('ViewAgendaOutlinedIcon')).toHaveLength(2);
  });

  it('PCとモバイルのルーティン新規作成ボタンに拡大表示用のclassを付与する', () => {
    const router = createMemoryRouter([
      { element: <AppShell />, children: [{ element: <h1>一覧画面</h1>, index: true }] },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByRole('link', { name: 'ルーティンを投稿' })).toHaveClass('hibilio-desktop-nav__create-trigger');
    expect(document.querySelector('.hibilio-mobile-nav__create-icon')).toHaveClass('hibilio-mobile-nav__create-icon--enlarged');
  });

  it('未入力で無効でも作成画面のモバイル投稿ボタンにアニメーション用classを付与する', () => {
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [{ element: <RoutineCreatePage service={{ create: vi.fn().mockResolvedValue(undefined) }} />, path: 'routines/new' }],
      },
    ], { initialEntries: ['/routines/new'] });

    render(<RouterProvider router={router} />);

    const mobileSubmit = document.querySelector<HTMLButtonElement>('.hibilio-mobile-nav__create-trigger');
    expect(mobileSubmit).toBeDisabled();
    expect(mobileSubmit).toHaveClass('hibilio-mobile-nav__create-trigger--attention');
  });

  it('モバイル投稿ボタンの案内は5秒後にフェードを始め、完了後に関連付けを解除して再入時に再表示する', async () => {
    vi.useFakeTimers();
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [{ element: <RoutineCreatePage service={{ create: vi.fn().mockResolvedValue(undefined) }} />, path: 'routines/new' }],
      },
    ], { initialEntries: ['/routines/new'] });

    render(<RouterProvider router={router} />);

    const mobileSubmit = document.querySelector<HTMLButtonElement>('.hibilio-mobile-nav__create-trigger');
    expect(mobileSubmit).toHaveAttribute('aria-describedby');
    const mobileGuide = document.querySelector('.hibilio-mobile-nav__create-guide');
    expect(mobileGuide).toHaveAttribute('role', 'tooltip');
    expect(mobileGuide).toHaveTextContent('ここを押して作成');
    expect(mobileGuide).toHaveTextContent('ルーティン名と行動の内容を入力すると投稿できます。');

    fireEvent.change(screen.getByLabelText(/ルーティン名/), { target: { value: '朝の習慣' } });
    await vi.advanceTimersByTimeAsync(4_999);
    expect(document.querySelector('.hibilio-mobile-nav__create-guide')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(1);
    expect(document.querySelector('.hibilio-mobile-nav__create-guide')).toHaveClass('hibilio-mobile-nav__create-guide--fading');
    expect(mobileSubmit).toHaveAttribute('aria-describedby');
    await vi.advanceTimersByTimeAsync(300);
    expect(document.querySelector('.hibilio-mobile-nav__create-guide')).not.toBeInTheDocument();
    expect(mobileSubmit).not.toHaveAttribute('aria-describedby');

    await act(async () => { await router.navigate('/'); });
    expect(document.querySelector('.hibilio-mobile-nav__create-guide')).not.toBeInTheDocument();
    await act(async () => { await router.navigate('/routines/new'); });

    const reenteredMobileSubmit = document.querySelector<HTMLButtonElement>('.hibilio-mobile-nav__create-trigger');
    expect(reenteredMobileSubmit).toHaveAttribute('aria-describedby');
    expect(document.querySelector('.hibilio-mobile-nav__create-guide')).toHaveAttribute(
      'id',
      reenteredMobileSubmit?.getAttribute('aria-describedby'),
    );
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

  it('PCとモバイルの一覧メニューは専用routeを選択して遷移できる', async () => {
    markAuthenticated();
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [
          { element: <h1>Home画面</h1>, path: 'home' },
          { element: <h1>一覧画面</h1>, path: 'feed' },
        ],
      },
    ], { initialEntries: ['/feed'] });

    render(<RouterProvider router={router} />);

    expect(screen.getByRole('link', { name: '一覧' })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('button', { name: '一覧' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.getByRole('heading', { name: 'Home画面' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '一覧' }));
    expect(screen.getByRole('heading', { name: '一覧画面' })).toBeInTheDocument();
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

  it('ルーティン投稿の送信中はモバイル投稿操作を無効化し、アニメーションを保ったまま連打送信しない', async () => {
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
    expect(mobileSubmit).toHaveClass('hibilio-mobile-nav__create-trigger--attention');

    await user.click(mobileSubmit!);
    expect(create).toHaveBeenCalledTimes(1);
    expect(mobileSubmit).toBeDisabled();
    expect(mobileSubmit).toHaveClass('hibilio-mobile-nav__create-trigger--attention');
    expect(create).toHaveBeenCalledTimes(1);

    resolveCreate?.();
    expect(await screen.findByText('ルーティンを投稿しました。')).toBeInTheDocument();
  });
});
