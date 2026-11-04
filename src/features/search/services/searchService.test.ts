import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSearchService, searchService } from './searchService';

afterEach(() => vi.unstubAllGlobals());

describe('searchService', () => {
  it('利用可能タグを取得し、タグだけのAND検索を配列識別子付きで送信する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ tags: [{ tag_identifier: 'tag-1', tag_name: '朝活' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchService.listTags()).resolves.toEqual([{ identifier: 'tag-1', label: '朝活' }]);
    await searchService.searchPage('routines', '', 1, ['tag-1', 'tag-2']);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/tags/pickup', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/routines/search?page=1&number_of_items_per_page=40&tag_identifiers%5B%5D=tag-1&tag_identifiers%5B%5D=tag-2', { credentials: 'include', method: 'GET' });
  });

  it('全件タグ候補を要求したときだけ全件endpointを呼ぶ', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tags: [{ tag_identifier: 'tag-2', tag_name: '読書' }] })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchService.listAllTags()).resolves.toEqual([{ identifier: 'tag-2', label: '読書' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/tags', { credentials: 'include', method: 'GET' });
  });

  it('人気タグをルーティン件数付きで取得し、契約外の件数を拒否する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tags: [{ routine_count: 12, tag_identifier: 'tag-3', tag_name: '朝活' }] })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchService.listPopularTags()).resolves.toEqual([{ identifier: 'tag-3', label: '朝活', routineCount: 12 }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/tags/popular', { credentials: 'include', method: 'GET' });
  });

  it('投稿検索APIの通常投稿・実行投稿・投稿なしroutineをカード表示モデルへ変換する', async () => {
    const service = createSearchService({
      listAllTags: async () => ({ tags: [] }),
      listTags: async () => ({ tags: [] }),
      searchAccounts: async () => ({ accounts: [], total: 0 }),
      searchRoutines: async () => ({
        items: [{
          account_identifier: '10000000-0000-4000-8000-000000000001',
          account_name: '実行者',
          customization_count: 2,
          executed_action_count: 3,
          execution_count: 1,
          icon_image_url: 'https://example.com/icons/executor.webp',
          item_type: 'routine_execution',
          liked: undefined,
          post_identifier: '40000000-0000-4000-8000-000000000001',
          post_like_count: 6,
          published_at: '2026-09-03T11:00:00+00:00',
          posted_at: '2026-09-03T11:00:00+00:00',
          routine_actions: [{ action_minutes: 5, action_name: '屈伸', routine_action_identifier: 'action-1' }],
          routine_execution_identifier: '20000000-0000-4000-8000-000000000001',
          routine_execution_memo: '完了',
          routine_execution_minutes: 15,
          routine_identifier: '30000000-0000-4000-8000-000000000001',
          routine_name: '朝のストレッチ',
          support_count: 4,
          supported: true,
          tags: [{ tag_identifier: 'tag-1', tag_name: '朝活' }],
        }, {
          account_identifier: '10000000-0000-4000-8000-000000000002',
          account_name: '作成者',
          customization_origin: {
            account_name: '親作者',
            icon_image_url: null,
            routine_identifier: '30000000-0000-4000-8000-000000000003',
            routine_name: '親の朝活ルーティン',
          },
          customization_count: 0,
          icon_image_url: null,
          item_type: 'routine',
          liked: null,
          post_identifier: null,
          post_like_count: null,
          published_at: '2026-09-02T11:00:00+00:00',
          posted_at: null,
          routine_actions: [],
          routine_execution_identifier: null,
          routine_execution_minutes: null,
          routine_identifier: '30000000-0000-4000-8000-000000000002',
          routine_name: '投稿なしルーティン',
          tags: [],
          execution_count: 0,
        }],
        total: 1,
      }),
    });

    await expect(service.searchPage('routines', 'ストレ', 1)).resolves.toEqual({
      items: [{
        accountId: '10000000-0000-4000-8000-000000000001',
        accountName: '実行者',
        customizations: 2,
        executedActionCount: 3,
        executionMemo: '完了',
        executions: 1,
        iconImageUrl: 'https://example.com/icons/executor.webp',
        itemType: 'routine_execution',
        likes: 6,
        publishedAt: '2026-09-03T11:00:00+00:00',
        postedAt: '2026-09-03T11:00:00+00:00',
        postId: '40000000-0000-4000-8000-000000000001',
        routineActions: [{ action: '屈伸', durationMinutes: 5 }],
        routineExecutionId: '20000000-0000-4000-8000-000000000001',
        routineExecutionMinutes: 15,
        routineId: '30000000-0000-4000-8000-000000000001',
        routineName: '朝のストレッチ',
        supportCount: 4,
        supported: true,
        tags: ['朝活'],
      }, {
        accountId: '10000000-0000-4000-8000-000000000002',
        accountName: '作成者',
        customizationOrigin: {
          accountName: '親作者',
          iconImageUrl: null,
          routineId: '30000000-0000-4000-8000-000000000003',
          routineName: '親の朝活ルーティン',
        },
        customizations: 0,
        executions: 0,
        iconImageUrl: null,
        itemType: 'routine',
        liked: null,
        likes: null,
        publishedAt: '2026-09-02T11:00:00+00:00',
        postedAt: null,
        postId: null,
        routineActions: [],
        routineExecutionId: null,
        routineExecutionMinutes: null,
        routineId: '30000000-0000-4000-8000-000000000002',
        routineName: '投稿なしルーティン',
        tags: [],
      }],
      total: 1,
    });
  });

  it('検索APIが非公開の親を customization_origin:null と返した場合、親情報なしの表示モデルへ変換する', async () => {
    const service = createSearchService({
      listAllTags: async () => ({ tags: [] }),
      listTags: async () => ({ tags: [] }),
      searchAccounts: async () => ({ accounts: [], total: 0 }),
      searchRoutines: async () => ({
        items: [{
          account_identifier: '10000000-0000-4000-8000-000000000002', account_name: '作成者', customization_count: 0, customization_origin: null, execution_count: 0, icon_image_url: null, item_type: 'routine', liked: null, post_identifier: null, post_like_count: null, posted_at: null, published_at: '2026-09-02T11:00:00+00:00', routine_actions: [], routine_execution_identifier: null, routine_execution_minutes: null, routine_identifier: '30000000-0000-4000-8000-000000000002', routine_name: '投稿なしルーティン', tags: [],
        }],
        total: 1,
      }),
    });

    await expect(service.searchPage('routines', '投稿なし', 1)).resolves.toMatchObject({ items: [{ customizationOrigin: null, itemType: 'routine', routineId: '30000000-0000-4000-8000-000000000002' }] });
  });

  it('投稿・Accountの検索APIを検索語とページネーション付きで呼び出す', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [], total: 0 })));
    vi.stubGlobal('fetch', fetchMock);

    await searchService.searchPage('routines', '朝 活', 2);
    await searchService.searchPage('accounts', 'アリ', 3);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/routines/search?title=%E6%9C%9D+%E6%B4%BB&page=2&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/accounts/search?account_name=%E3%82%A2%E3%83%AA&page=3&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
  });

  it('実行投稿に必須の投稿識別子・投稿日時・実行識別子が欠けた契約を拒否する', async () => {
    const service = createSearchService({
      listAllTags: async () => ({ tags: [] }),
      listTags: async () => ({ tags: [] }),
      searchAccounts: async () => ({ accounts: [], total: 0 }),
      searchRoutines: async () => ({
        items: [{
          account_identifier: 'account-1', account_name: '実行者', customization_count: 0, executed_action_count: 1, execution_count: 1, icon_image_url: null, item_type: 'routine_execution', post_identifier: null, post_like_count: null, posted_at: null, published_at: '2026-09-03T11:00:00+00:00', routine_actions: [], routine_execution_identifier: null, routine_execution_memo: null, routine_execution_minutes: null, routine_identifier: 'routine-1', routine_name: '朝活', support_count: 0, supported: false, tags: [],
        }], total: 1,
      }),
    });

    await expect(service.searchPage('routines', '朝活', 1)).rejects.toThrow();
  });

  it('Account検索へタグのみ・名前と複数タグを送信する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [], total: 0 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [], total: 0 })));
    vi.stubGlobal('fetch', fetchMock);

    await searchService.searchPage('accounts', '', 1, ['tag-1']);
    await searchService.searchPage('accounts', 'アリ', 2, ['tag-1', 'tag-2']);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/accounts/search?page=1&number_of_items_per_page=40&tag_identifiers%5B%5D=tag-1', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/accounts/search?account_name=%E3%82%A2%E3%83%AA&page=2&number_of_items_per_page=40&tag_identifiers%5B%5D=tag-1&tag_identifiers%5B%5D=tag-2', { credentials: 'include', method: 'GET' });
  });

  it('HTTP失敗と契約外レスポンスをエラーとして扱う', async () => {
    const service = createSearchService({
      listAllTags: async () => ({ tags: [] }),
      listTags: async () => ({ tags: [] }),
      searchAccounts: async () => ({ accounts: [], total: 'invalid' }),
      searchRoutines: async () => { throw new Error('network error'); },
    });

    await expect(service.searchPage('routines', '朝', 1)).rejects.toThrow('network error');
    await expect(service.searchPage('accounts', 'アリ', 1)).rejects.toThrow();
  });
});
