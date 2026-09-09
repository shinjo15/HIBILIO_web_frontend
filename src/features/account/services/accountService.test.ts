import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccountService } from './accountService';

afterEach(() => vi.unstubAllGlobals());

describe('createAccountService', () => {
  it('GET /api/my/account の契約をプロフィール表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      account_bio: null,
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: 'ログインアカウント',
      favorite_tags: [{
        tag_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        tag_name: '朝活',
      }],
      social_links: [{
        social_type: 'x',
        social_url: 'https://x.com/example',
      }],
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createAccountService();

    await expect(service.getProfile()).resolves.toEqual({
      bio: null,
      favoriteTags: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '朝活' }],
      initial: 'ロ',
      name: 'ログインアカウント',
      socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/example' }],
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account', { credentials: 'include', method: 'GET' });
  });

  it('プロフィール API が401なら未認証エラーを返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const service = createAccountService();

    await expect(service.getProfile()).rejects.toMatchObject({ name: 'AccountUnauthorizedError' });
  });

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
