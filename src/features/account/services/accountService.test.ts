import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccountService } from './accountService';

afterEach(() => vi.unstubAllGlobals());

describe('createAccountService', () => {
  it('GET /api/my/likes の契約をいいね表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      likes: [{
        liked_at: '2026-09-03T12:00:00+00:00',
        post_category: 'routine',
        post_identifier: 'post-1',
        post_like_count: 2,
        post_support_count: 4,
        routine_identifier: 'routine-1',
      }],
      total: 1,
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createAccountService();

    await expect(service.listLikes()).resolves.toEqual([{
      likedAt: '2026-09-03T12:00:00+00:00',
      postCategory: 'routine',
      postId: 'post-1',
      routineId: 'routine-1',
      supports: 4,
      totalLikes: 2,
    }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/likes', { credentials: 'include', method: 'GET' });
  });

  it('不正ないいね API レスポンスを拒否する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ likes: [], total: 'one' }))));
    const service = createAccountService();

    await expect(service.listLikes()).rejects.toThrow();
  });
});
