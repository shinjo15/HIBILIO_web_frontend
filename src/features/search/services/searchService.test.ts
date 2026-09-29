import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSearchService, searchService } from './searchService';

afterEach(() => vi.unstubAllGlobals());

describe('searchService', () => {
  it('投稿検索APIのDTOを検索専用カードの表示モデルへ変換する', async () => {
    const service = createSearchService({
      searchAccounts: async () => ({ accounts: [], total: 0 }),
      searchRoutines: async () => ({
        items: [{
          account_identifier: '10000000-0000-4000-8000-000000000001',
          account_name: '実行者',
          icon_image_url: 'https://example.com/icons/executor.webp',
          item_type: 'routine_execution',
          published_at: '2026-09-03T11:00:00+00:00',
          routine_execution_identifier: '20000000-0000-4000-8000-000000000001',
          routine_identifier: '30000000-0000-4000-8000-000000000001',
          routine_name: '朝のストレッチ',
          tags: [{ tag_identifier: 'tag-1', tag_name: '朝活' }],
        }],
        total: 1,
      }),
    });

    await expect(service.searchPage('routines', 'ストレ', 1)).resolves.toEqual({
      items: [{
        accountId: '10000000-0000-4000-8000-000000000001',
        accountName: '実行者',
        iconImageUrl: 'https://example.com/icons/executor.webp',
        itemType: 'routine_execution',
        publishedAt: '2026-09-03T11:00:00+00:00',
        routineExecutionId: '20000000-0000-4000-8000-000000000001',
        routineId: '30000000-0000-4000-8000-000000000001',
        routineName: '朝のストレッチ',
        tags: ['朝活'],
      }],
      total: 1,
    });
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

  it('HTTP失敗と契約外レスポンスをエラーとして扱う', async () => {
    const service = createSearchService({
      searchAccounts: async () => ({ accounts: [], total: 'invalid' }),
      searchRoutines: async () => { throw new Error('network error'); },
    });

    await expect(service.searchPage('routines', '朝', 1)).rejects.toThrow('network error');
    await expect(service.searchPage('accounts', 'アリ', 1)).rejects.toThrow();
  });
});
