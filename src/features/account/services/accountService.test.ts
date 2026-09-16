import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccountService } from './accountService';

afterEach(() => vi.unstubAllGlobals());

describe('createAccountService', () => {
  it('GET /api/my/account の契約をプロフィール表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      account_bio: null,
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: 'ログインアカウント',
      header_image_url: 'https://example.com/headers/account.webp',
      icon_image_url: 'https://example.com/icons/account.webp',
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
      accountIdentifier: '11111111-1111-4111-8111-111111111111',
      bio: null,
      favoriteTags: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '朝活' }],
      headerImageUrl: 'https://example.com/headers/account.webp',
      initial: 'ロ',
      iconImageUrl: 'https://example.com/icons/account.webp',
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

  it('GET /api/my/posts の契約を投稿表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: '投稿者',
        customization_count: 1,
        execution_count: 3,
        post_identifier: 'post-1',
        post_like_count: 2,
        post_support_count: 4,
        posted_at: '2026-09-03T12:00:00+00:00',
        routine_actions: [],
        routine_execution_minutes: 30,
        routine_identifier: 'routine-1',
        routine_name: '朝の集中ルーティン',
        tags: [],
      }],
      total: 1,
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createAccountService();

    await expect(service.listPosts()).resolves.toEqual([{
      accountId: '11111111-1111-4111-8111-111111111111',
      authorName: '投稿者',
      createdAt: '2026-09-03T12:00:00+00:00',
      customizations: 1,
      durationMinutes: 30,
      executions: 3,
      id: 'post-1',
      iconImageUrl: null,
      liked: false,
      likes: 2,
      routineId: 'routine-1',
      steps: [],
      supports: 4,
      tags: [],
      title: '朝の集中ルーティン',
    }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/posts?page=1&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
  });

  it('GET /api/my/likes の契約をいいね表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: '投稿者',
        customization_count: 1,
        execution_count: 3,
        liked_at: '2026-09-04T12:00:00+00:00',
        post_identifier: 'post-1',
        post_like_count: 2,
        post_support_count: 4,
        posted_at: '2026-09-03T12:00:00+00:00',
        routine_actions: [],
        routine_execution_minutes: 30,
        routine_identifier: 'routine-1',
        routine_name: '朝の集中ルーティン',
        tags: [],
      }],
      total: 1,
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createAccountService();

    await expect(service.listLikes()).resolves.toEqual([{
      accountId: '11111111-1111-4111-8111-111111111111',
      authorName: '投稿者',
      createdAt: '2026-09-03T12:00:00+00:00',
      customizations: 1,
      durationMinutes: 30,
      executions: 3,
      id: 'post-1',
      iconImageUrl: null,
      liked: true,
      likes: 2,
      routineId: 'routine-1',
      steps: [],
      supports: 4,
      tags: [],
      title: '朝の集中ルーティン',
    }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/likes?page=1&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
  });

  it('投稿・いいね・実行履歴のページ結果を items と total で返す', async () => {
    const post = {
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: '投稿者',
      customization_count: 1,
      execution_count: 3,
      post_identifier: 'post-1',
      post_like_count: 2,
      post_support_count: 4,
      posted_at: '2026-09-03T12:00:00+00:00',
      routine_actions: [],
      routine_execution_minutes: 30,
      routine_identifier: 'routine-1',
      routine_name: '朝の集中ルーティン',
      tags: [],
    };
    const execution = {
      executed_action_count: 2,
      posted_at: '2026-09-03T12:00:00+00:00',
      routine_execution_identifier: 'execution-1',
      routine_execution_memo: '集中できました',
      routine_identifier: 'routine-1',
      routine_name: '朝の集中ルーティン',
      support_count: 3,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [post], total: 3 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ ...post, liked_at: '2026-09-04T12:00:00+00:00' }], total: 4 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [execution], total: 5 })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createAccountService();

    await expect(service.listPostsPage?.(2)).resolves.toMatchObject({ items: [{ id: 'post-1' }], total: 3 });
    await expect(service.listLikesPage?.(3)).resolves.toMatchObject({ items: [{ id: 'post-1' }], total: 4 });
    await expect(service.listExecutionHistoriesPage?.(4)).resolves.toMatchObject({ items: [{ id: 'execution-1' }], total: 5 });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/my/posts?page=2&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/my/likes?page=3&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/my/routine-executions?page=4&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
  });

  it('GET /api/my/blocks のicon_image_urlをブロック中アカウントへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      blocks: [{
        account_bio: 'ブロック中です',
        account_identifier: '22222222-2222-4222-8222-222222222222',
        account_name: 'ブロック中のアカウント',
        icon_image_url: 'https://example.com/icons/blocked-account.webp',
      }],
    })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAccountService().listBlockedAccounts()).resolves.toEqual([{
      accountIdentifier: '22222222-2222-4222-8222-222222222222',
      bio: 'ブロック中です',
      iconImageUrl: 'https://example.com/icons/blocked-account.webp',
      name: 'ブロック中のアカウント',
    }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/blocks', { credentials: 'include', method: 'GET' });
  });


  it('ブロック中アカウント取得が401なら未認証エラーを返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const service = createAccountService();

    await expect(service.listBlockedAccounts()).rejects.toMatchObject({ name: 'AccountUnauthorizedError' });
  });
});
