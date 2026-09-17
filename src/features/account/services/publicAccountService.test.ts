import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPublicAccountService } from './publicAccountService';

afterEach(() => vi.unstubAllGlobals());

describe('createPublicAccountService', () => {
  it('GET /api/accounts/{account_identifier} の契約を公開プロフィール表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      account_bio: null,
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: '公開アカウント',
      header_image_url: 'https://example.com/headers/public.webp',
      icon_image_url: 'https://example.com/icons/public.webp',
      favorite_tags: [{ tag_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tag_name: '朝活' }],
      social_links: [{ social_type: 'x', social_url: 'https://x.com/example' }],
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createPublicAccountService();

    await expect(service.get('11111111-1111-4111-8111-111111111111')).resolves.toEqual({
      accountIdentifier: '11111111-1111-4111-8111-111111111111',
      bio: null,
      favoriteTags: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '朝活' }],
      headerImageUrl: 'https://example.com/headers/public.webp',
      initial: '公',
      iconImageUrl: 'https://example.com/icons/public.webp',
      name: '公開アカウント',
      socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/example' }],
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/accounts/11111111-1111-4111-8111-111111111111', { method: 'GET' });
  });

  it('公開されていないか存在しないアカウントは null を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(createPublicAccountService().get('missing-account')).resolves.toBeNull();
  });

  it('公開投稿・いいね・実行履歴のページ結果を返す', async () => {
    const post = {
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: '投稿者',
      customization_count: 1,
      execution_count: 3,
      liked: false,
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
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ ...post, liked: true, liked_at: '2026-09-04T12:00:00+00:00' }], total: 4 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [execution], total: 5 })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createPublicAccountService();

    await expect(service.listPostsPage?.('account-1', 2)).resolves.toMatchObject({ items: [{ id: 'post-1' }], total: 3 });
    await expect(service.listLikesPage?.('account-1', 3)).resolves.toMatchObject({ items: [{ id: 'post-1' }], total: 4 });
    await expect(service.listExecutionHistoriesPage?.('account-1', 4)).resolves.toMatchObject({ items: [{ id: 'execution-1' }], total: 5 });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/accounts/account-1/posts?page=2&number_of_items_per_page=40');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/accounts/account-1/likes?page=3&number_of_items_per_page=40');
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/accounts/account-1/routine-executions?page=4&number_of_items_per_page=40');
  });
});
