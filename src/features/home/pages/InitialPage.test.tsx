import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import { InitialPage } from './InitialPage';

afterEach(() => {
  cleanup();
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('InitialPage', () => {
  it('認証復元中は未認証の一覧へ遷移せず、復元後にホームを初期表示する', async () => {
    let resolveSession: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveSession = resolve; })));

    render(<MemoryRouter initialEntries={['/']}><Routes><Route element={<InitialPage />} path="/" /><Route element={<h1>ホーム</h1>} path="/home" /></Routes></MemoryRouter>);

    expect(screen.getByRole('status')).toHaveTextContent('ホームを読み込んでいます…');
    expect(screen.queryByRole('heading', { name: 'ホーム' })).not.toBeInTheDocument();
    resolveSession?.(new Response(null, { status: 200 }));
    expect(await screen.findByRole('heading', { name: 'ホーム' })).toBeInTheDocument();
  });

  it('復元済みのログイン状態ではホームを初期表示する', async () => {
    markAuthenticated();

    render(<MemoryRouter initialEntries={['/']}><Routes><Route element={<InitialPage />} path="/" /><Route element={<h1>ホーム</h1>} path="/home" /></Routes></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'ホーム' })).toBeInTheDocument());
  });

  it('未認証の初期アクセスでは人気一覧を表示する', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/my/account') return Promise.resolve(new Response(null, { status: 401 }));
      if (input === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'csrf-token' })));
      if (input === '/api/persistent-login/restore') return Promise.resolve(new Response(null, { status: 401 }));
      if (input === '/api/posts/popular?number_of_items_per_page=40&page=1') return Promise.resolve(new Response(JSON.stringify({ posts: [], total: 0 })));
      return Promise.resolve(new Response(null, { status: 500 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/']}><Routes><Route element={<InitialPage />} path="/" /></Routes></MemoryRouter>);

    expect((await screen.findAllByRole('tab')).map((tab) => tab.textContent)).toEqual(['人気']);
    expect(fetchMock).toHaveBeenCalledWith('/api/posts/popular?number_of_items_per_page=40&page=1', {
      credentials: 'include',
      method: 'GET',
    });
  });
});
