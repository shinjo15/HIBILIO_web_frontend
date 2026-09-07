import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoutineFeedService, routineFeedService } from './routineFeedService';

const response = {
  posts: [{
    account_name: '田中 陽介',
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
    const service = createRoutineFeedService({ list: async () => response });

    await expect(service.list('recommended')).resolves.toEqual([{
      authorName: '田中 陽介',
      createdAt: '2026-09-04T00:00:00+00:00',
      customizations: 3,
      durationMinutes: 25,
      executions: 12,
      id: 'post-1',
      liked: true,
      likes: 14,
      routineId: 'routine-1',
      steps: [{ action: '水を飲む', durationMinutes: 10 }],
      supports: 4,
      tags: ['朝活'],
      title: '朝の集中ルーティン',
    }]);
  });

  it('フォロー中・おすすめ・人気の各APIを認証Cookieとページネーション付きで呼び出す', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => response, ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await routineFeedService.list('following');
    await routineFeedService.list('recommended');
    await routineFeedService.list('popular');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/following/posts?number_of_items_per_page=20&page=1', {
      credentials: 'include',
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/posts/favorite_tags?number_of_items_per_page=20&page=1', {
      credentials: 'include',
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/posts/popular?number_of_items_per_page=20&page=1', {
      credentials: 'include',
      method: 'GET',
    });
  });

  it('HTTP失敗と不正なレスポンスをエラーとして扱う', async () => {
    const failedFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal('fetch', failedFetch);
    await expect(routineFeedService.list('following')).rejects.toThrow('401');

    const service = createRoutineFeedService({ list: async () => ({ posts: [], total: 'invalid' }) });
    await expect(service.list()).rejects.toThrow();
  });
});