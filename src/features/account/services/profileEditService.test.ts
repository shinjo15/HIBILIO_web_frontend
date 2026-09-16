import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProfileEditService, type EditableProfile } from './profileEditService';

afterEach(() => vi.unstubAllGlobals());

const apiProfile = {
  account_bio: null,
  account_identifier: '11111111-1111-4111-8111-111111111111',
  account_name: 'ログインアカウント',
  header_image_url: 'https://example.com/headers/account.webp',
  icon_image_url: 'https://example.com/icons/account.webp',
  favorite_tags: [{ tag_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tag_name: '朝活' }],
  social_links: [{ social_type: 'x', social_url: 'https://x.com/example' }],
  ui_mode: 'system',
};

const editableProfile: EditableProfile = {
  accountIdentifier: '11111111-1111-4111-8111-111111111111',
  bio: '',
  favoriteTags: [{ identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '朝活' }],
  headerImage: null,
  iconImage: null,
  name: '更新後アカウント',
  socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/updated' }],
  uiMode: 'system',
};

describe('createProfileEditService', () => {
  it('GET /api/my/account の応答を編集用プロフィールへ変換し、タグ識別子を保持する', async () => {
    const service = createProfileEditService({
      get: async () => apiProfile,
      getCsrfToken: async () => ({ csrf_token: 'csrf-token' }),
      getTagCandidates: async () => ({ tags: [] }),
      patch: async () => new Response(null, { status: 204 }),
    });

    await expect(service.load()).resolves.toEqual({
      ...editableProfile,
      headerImageUrl: 'https://example.com/headers/account.webp',
      iconImageUrl: 'https://example.com/icons/account.webp',
      name: 'ログインアカウント',
      socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/example' }],
    });
  });

  it('JSONで全プロフィール項目をCSRFとCookie付きPATCHし、空文字と空配列をnull・[]で送る', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await createProfileEditService().save({ ...editableProfile, favoriteTags: [], socialLinks: [] });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/my/account', {
      body: JSON.stringify({
        account_bio: null,
        account_name: '更新後アカウント',
        favorite_tag_identifiers: [],
        social_links: [],
      }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
  });

  it('選択した画像がある場合、JSON保存後に_method=PATCH付きmultipart POSTで選択済みファイルだけを送る', async () => {
    const icon = new File(['icon'], 'icon.png', { type: 'image/png' });
    const header = new File(['header'], 'header.webp', { type: 'image/webp' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await createProfileEditService().save({ ...editableProfile, iconImage: icon, headerImage: header });

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/my/account', {
      body: expect.any(String),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
    const imageRequest = fetchMock.mock.calls[3][1] as RequestInit;
    const imageBody = imageRequest.body as FormData;
    expect(imageBody.get('icon_image')).toBe(icon);
    expect(imageBody.get('header_image')).toBe(header);
    expect(imageBody.get('_method')).toBe('PATCH');
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/my/account', {
      body: imageBody,
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
  });

  it('タグ候補をGET /api/tagsから識別子付きで取得する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tags: [{ tag_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tag_name: '朝活' }],
    })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createProfileEditService().loadTagCandidates()).resolves.toEqual([
      { identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '朝活' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/tags');
  });

  it('保存時の401を未認証エラーにする', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 401 })));

    await expect(createProfileEditService().save(editableProfile)).rejects.toMatchObject({ name: 'ProfileEditUnauthorizedError' });
  });

  it('既定アダプターが401を返すと未認証エラーにする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(createProfileEditService().load()).rejects.toMatchObject({ name: 'ProfileEditUnauthorizedError' });
  });
});
