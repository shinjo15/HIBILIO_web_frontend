import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetAuthenticationForTesting } from '../../auth/services/authSession';
import { FeedPage } from './FeedPage';

afterEach(() => {
  cleanup();
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('FeedPage', () => {
  it('直接アクセス時は認証復元を完了してから認証済み一覧を表示する', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input === '/api/my/account') return Promise.resolve(new Response(null, { status: 200 }));
      if (input === '/api/posts/favorite_tags?number_of_items_per_page=40&page=1') return Promise.resolve(new Response(JSON.stringify({ posts: [], total: 0 })));
      return Promise.resolve(new Response(null, { status: 500 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><FeedPage /></MemoryRouter>);

    expect(screen.getByRole('status')).toHaveTextContent('ホームを読み込んでいます…');
    expect(screen.queryByRole('tab', { name: 'おすすめ' })).not.toBeInTheDocument();
    expect((await screen.findAllByRole('tab')).map((tab) => tab.textContent)).toEqual(['フォロー中', 'おすすめ', '人気', 'フォロー中アカウント']);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/posts/favorite_tags?number_of_items_per_page=40&page=1', {
      credentials: 'include',
      method: 'GET',
    }));
  });
});
