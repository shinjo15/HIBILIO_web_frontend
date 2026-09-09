import { afterEach, describe, expect, it, vi } from 'vitest';
import { routineLikeService, RoutineLikeUnauthorizedError } from './routineLikeService';

afterEach(() => vi.unstubAllGlobals());

describe('routineLikeService', () => {
  it('CSRFトークン付きでいいね作成APIを呼び出す', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await routineLikeService.create('11111111-1111-4111-8111-111111111111');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/likes', {
      body: JSON.stringify({ post_identifier: '11111111-1111-4111-8111-111111111111' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
  });

  it('未認証を専用エラーとして返す', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 401 })));

    await expect(routineLikeService.create('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(RoutineLikeUnauthorizedError);
  });
});
