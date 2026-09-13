import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProfileEditService } from './profileEditService';

afterEach(() => vi.unstubAllGlobals());

describe('createProfileEditService', () => {
  it('GET /api/my/account の応答を編集用プロフィールへ変換し、タグ識別子を保持する', async () => {
    const service = createProfileEditService({
      get: async () => ({
        account_bio: null,
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: 'ログインアカウント',
        favorite_tags: [{ tag_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tag_name: '朝活' }],
        social_links: [{ social_type: 'x', social_url: 'https://x.com/example' }],
        ui_mode: 'system',
      }),
    });

    await expect(service.load()).resolves.toEqual({
      accountIdentifier: '11111111-1111-4111-8111-111111111111',
      bio: '',
      favoriteTags: [{ identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '朝活' }],
      headerImageName: null,
      iconImageName: null,
      name: 'ログインアカウント',
      socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/example' }],
      uiMode: 'system',
    });
  });

  it('既定アダプターは認証Cookie付きで GET /api/my/account を呼ぶ', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      account_bio: '自己紹介',
      account_identifier: '11111111-1111-4111-8111-111111111111',
      account_name: 'ログインアカウント',
      favorite_tags: [],
      social_links: [],
      ui_mode: 'dark',
    })));
    vi.stubGlobal('fetch', fetchMock);

    await createProfileEditService().load();

    expect(fetchMock).toHaveBeenCalledWith('/api/my/account', { credentials: 'include', method: 'GET' });
  });

  it('既定アダプターが401を返すと未認証エラーにする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(createProfileEditService().load()).rejects.toMatchObject({ name: 'ProfileEditUnauthorizedError' });
  });

  it('アダプター応答に ui_mode がなければ zod の契約エラーにする', async () => {
    const service = createProfileEditService({
      get: async () => ({
        account_bio: null,
        account_identifier: '11111111-1111-4111-8111-111111111111',
        account_name: 'ログインアカウント',
        favorite_tags: [],
        social_links: [],
      }),
    });

    await expect(service.load()).rejects.toMatchObject({ name: 'ZodError' });
  });

});
