import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoutineFeedService, RoutineFeedUnauthorizedError, routineFeedService } from './routineFeedService';

const response = {
  posts: [{
    account_identifier: '10000000-0000-4000-8000-000000000001',
    account_name: '田中 陽介',
    icon_image_url: 'https://example.com/icons/tanaka.webp',
    customization_count: 3,
    execution_count: 12,
    liked: true,
    post_category: 'routine',
    post_identifier: 'post-1',
    post_like_count: 14,
    post_support_count: 4,
    posted_at: '2026-09-04T00:00:00+00:00',
    routine_actions: [{
      action_minutes: 10,
      action_name: '水を飲む',
      routine_action_identifier: 'action-1',
    }],
    routine_execution_minutes: 25,
    routine_identifier: 'routine-1',
    routine_name: '朝の集中ルーティン',
    tags: [{ tag_identifier: 'tag-1', tag_name: '朝活' }],
  }],
  total: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe('routineFeedService', () => {
  it('API DTOをルーティンフィードのViewModelへ変換する', async () => {
    const service = createRoutineFeedService({ list: async () => response, listFollowingAccounts: async () => ({ following_accounts: [] }) });

    await expect(service.list('recommended')).resolves.toEqual([{
      accountId: '10000000-0000-4000-8000-000000000001',
      authorName: '田中 陽介',
      createdAt: '2026-09-04T00:00:00+00:00',
      customizations: 3,
      durationMinutes: 25,
      executions: 12,
      id: 'post-1',
      iconImageUrl: 'https://example.com/icons/tanaka.webp',
      liked: true,
      likes: 14,
      routineId: 'routine-1',
      steps: [{ action: '水を飲む', durationMinutes: 10 }],
      supports: 4,
      tags: ['朝活'],
      title: '朝の集中ルーティン',
    }]);
  });

  it('ページ指定の結果を items と total で返し、従来の list は配列のまま維持する', async () => {
    const list = vi.fn().mockResolvedValue(response);
    const service = createRoutineFeedService({ list, listFollowingAccounts: async () => ({ following_accounts: [] }) });

    await expect(service.listPage('recommended', 2)).resolves.toMatchObject({
      items: [{ id: 'post-1' }],
      total: 1,
    });
    await expect(service.list('recommended')).resolves.toHaveLength(1);
    expect(list).toHaveBeenNthCalledWith(1, 'recommended', 2);
    expect(list).toHaveBeenNthCalledWith(2, 'recommended', 1);
  });

  it('フォロー中・おすすめ・人気の各APIを認証Cookieとページネーション付きで呼び出す', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => response, ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await routineFeedService.list('following');
    await routineFeedService.list('recommended');
    await routineFeedService.list('popular');
    await routineFeedService.listPage('popular', 2);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/following/posts?number_of_items_per_page=40&page=1', {
      credentials: 'include',
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/posts/favorite_tags?number_of_items_per_page=40&page=1', {
      credentials: 'include',
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/posts/popular?number_of_items_per_page=40&page=1', {
      credentials: 'include',
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/posts/popular?number_of_items_per_page=40&page=2', {
      credentials: 'include',
      method: 'GET',
    });
  });

  it('GET /api/my/following の契約をフォロー中アカウントの表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      following_accounts: [{
        account_bio: '朝の時間を大切にしています。',
        account_identifier: '22222222-2222-4222-8222-222222222222',
        account_name: '田中 花子',
      }],
    })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(routineFeedService.listFollowingAccounts()).resolves.toEqual([{
      accountIdentifier: '22222222-2222-4222-8222-222222222222',
      bio: '朝の時間を大切にしています。',
      iconImageUrl: null,
      name: '田中 花子',
    }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/following', { credentials: 'include', method: 'GET' });
  });

  it('HTTP失敗と不正なレスポンスをエラーとして扱う', async () => {
    const failedFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal('fetch', failedFetch);
    await expect(routineFeedService.list('following')).rejects.toBeInstanceOf(RoutineFeedUnauthorizedError);

    const service = createRoutineFeedService({ list: async () => ({ posts: [], total: 'invalid' }), listFollowingAccounts: async () => ({ following_accounts: [] }) });
    await expect(service.list()).rejects.toThrow();
  });
});