import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPublicAccountService } from './publicAccountService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PublicAccountService routines', () => {
  it('公開ルーティンAPIの未投稿項目を含むレスポンスをそのまま表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: '公開アカウント',
        customization_count: 0,
        execution_count: 0,
        icon_image_url: null,
        liked: null,
        post_identifier: null,
        post_like_count: null,
        post_support_count: null,
        posted_at: null,
        routine_actions: [{ action_minutes: 20, action_name: '集中', routine_action_identifier: '22222222-2222-4222-8222-222222222222' }],
        routine_execution_minutes: 20,
        routine_identifier: '33333333-3333-4333-8333-333333333333',
        routine_name: '未投稿ルーティン',
        tags: [{ tag_identifier: '44444444-4444-4444-8444-444444444444', tag_name: '朝活' }],
      }],
      total: 3,
    })));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createPublicAccountService().listRoutinesPage?.('11111111-1111-4111-8111-111111111111', 2);

    expect(fetchMock).toHaveBeenCalledWith('/api/accounts/11111111-1111-4111-8111-111111111111/routines?page=2&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
    expect(result).toEqual({
      items: [{
        accountId: '11111111-1111-4111-8111-111111111111',
        authorName: '公開アカウント',
        createdAt: null,
        customizations: 0,
        durationMinutes: 20,
        executions: 0,
        iconImageUrl: null,
        id: null,
        liked: null,
        likes: null,
        routineId: '33333333-3333-4333-8333-333333333333',
        steps: [{ action: '集中', durationMinutes: 20 }],
        tags: ['朝活'],
        title: '未投稿ルーティン',
      }],
      total: 3,
    });
  });
});
