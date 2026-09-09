import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPublicAccountService } from './publicAccountService';

afterEach(() => vi.unstubAllGlobals());

describe('createPublicAccountService', () => {
  it('GET /api/accounts/{account_identifier} の契約を公開プロフィール表示モデルへ変換する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      account_bio: null,
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: '公開アカウント',
      favorite_tags: [{ tag_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tag_name: '朝活' }],
      social_links: [{ social_type: 'x', social_url: 'https://x.com/example' }],
    })));
    vi.stubGlobal('fetch', fetchMock);
    const service = createPublicAccountService();

    await expect(service.get('11111111-1111-4111-8111-111111111111')).resolves.toEqual({
      bio: null,
      favoriteTags: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '朝活' }],
      initial: '公',
      name: '公開アカウント',
      socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/example' }],
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/accounts/11111111-1111-4111-8111-111111111111', { method: 'GET' });
  });

  it('公開されていないか存在しないアカウントは null を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(createPublicAccountService().get('missing-account')).resolves.toBeNull();
  });
});
