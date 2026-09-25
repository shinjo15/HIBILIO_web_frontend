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
      visibility: 'private',
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
      visibility: 'private',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account', { credentials: 'include', method: 'GET' });
  });

  it('プロフィール API が401なら未認証エラーを返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const service = createAccountService();

    await expect(service.getProfile()).rejects.toMatchObject({ name: 'AccountUnauthorizedError' });
  });

  it('GET /api/routine-executions/{id} の契約を実行詳細表示モデルへ変換する', async () => {
    const executionIdentifier = '22222222-2222-4222-8222-222222222222';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: 'ログインアカウント',
      executed_at: '2026-09-03T12:00:00+00:00',
      icon_image_url: 'https://example.com/icons/account.webp',
      posted_at: '2026-09-03T12:30:00+00:00',
      routine_execution_actions: [{
        action_memo: '背筋を伸ばす',
        action_minutes: 5,
        action_name: 'ストレッチ',
        routine_action_identifier: '33333333-3333-4333-8333-333333333333',
      }],
      routine_execution_identifier: executionIdentifier,
      routine_execution_memo: '集中できました',
      routine_identifier: '44444444-4444-4444-8444-444444444444',
      routine_memo: '朝の習慣',
      routine_name: '朝の集中ルーティン',
      support_count: 3,
      tags: [{ tag_identifier: '55555555-5555-4555-8555-555555555555', tag_name: '朝活' }],
    })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAccountService().getExecutionHistory(executionIdentifier)).resolves.toMatchObject({
      actions: [{ id: '33333333-3333-4333-8333-333333333333', minutes: 5, name: 'ストレッチ' }],
      executedAt: '2026-09-03T12:00:00+00:00',
      id: executionIdentifier,
      routineId: '44444444-4444-4444-8444-444444444444',
      routineTitle: '朝の集中ルーティン',
      supportCount: 3,
      tags: [{ id: '55555555-5555-4555-8555-555555555555', name: '朝活' }],
    });
    expect(fetchMock).toHaveBeenCalledWith(`/api/routine-executions/${executionIdentifier}`, { credentials: 'include', method: 'GET' });
  });

  it('実行詳細 API が404なら null を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(createAccountService().getExecutionHistory('22222222-2222-4222-8222-222222222222')).resolves.toBeNull();
  });

  it('GET /api/my/posts の契約を投稿表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
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
        liked: true,
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

  it('GET /api/my/follow-requests の契約を受信フォローリクエスト表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      follow_requests: [{
        account_bio: '新しい申請者の自己紹介',
        account_identifier: '22222222-2222-4222-8222-222222222222',
        account_name: '新しい申請者',
        icon_image_url: 'https://example.com/icons/requesting-account.webp',
      }],
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createAccountService();

    await expect(service.listReceivedFollowRequests()).resolves.toEqual([{
      accountIdentifier: '22222222-2222-4222-8222-222222222222',
      bio: '新しい申請者の自己紹介',
      iconImageUrl: 'https://example.com/icons/requesting-account.webp',
      name: '新しい申請者',
    }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/follow-requests', { credentials: 'include', method: 'GET' });
  });

  it('受信フォローリクエスト API が401なら未認証エラーを返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(createAccountService().listReceivedFollowRequests()).rejects.toMatchObject({ name: 'AccountUnauthorizedError' });
  });

  it('GET /api/my/sent-follow-requests の契約を送信済みフォローリクエスト表示モデルへ返却順のまま変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      follow_requests: [
        {
          account_bio: '保留中の自己紹介',
          account_identifier: '22222222-2222-4222-8222-222222222222',
          account_name: '保留中の申請先',
          header_image_url: 'https://example.com/headers/pending-account.webp',
          icon_image_url: 'https://example.com/icons/pending-account.webp',
        },
        {
          account_bio: null,
          account_identifier: '33333333-3333-4333-8333-333333333333',
          account_name: '却下済みの申請先',
          header_image_url: 'https://example.com/headers/rejected-account.webp',
          icon_image_url: 'https://example.com/icons/rejected-account.webp',
        },
      ],
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createAccountService();

    await expect(service.listSentFollowRequests()).resolves.toEqual([
      {
        accountIdentifier: '22222222-2222-4222-8222-222222222222',
        bio: '保留中の自己紹介',
        iconImageUrl: 'https://example.com/icons/pending-account.webp',
        name: '保留中の申請先',
      },
      {
        accountIdentifier: '33333333-3333-4333-8333-333333333333',
        bio: null,
        iconImageUrl: 'https://example.com/icons/rejected-account.webp',
        name: '却下済みの申請先',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/sent-follow-requests', { credentials: 'include', method: 'GET' });
  });
});
