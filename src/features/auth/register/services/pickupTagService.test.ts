import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPickupTags } from './pickupTagService';

afterEach(() => vi.unstubAllGlobals());

describe('getPickupTags', () => {
  it('pickupタグAPIのレスポンスを登録画面向けに変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tags: [{ tag_identifier: '20000000-0000-4000-8000-000000000001', tag_name: '朝活' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPickupTags()).resolves.toEqual([
      { identifier: '20000000-0000-4000-8000-000000000001', label: '朝活' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/tags/pickup');
  });
});
