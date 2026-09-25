import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FollowRequestUnauthorizedError,
  followRequestService,
} from './followRequestService';

afterEach(() => vi.unstubAllGlobals());

describe('followRequestService', () => {
  it('CSRFトークンを添えて承認APIを呼び出す', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(followRequestService.approve('11111111-1111-4111-8111-111111111111')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/follow-requests/11111111-1111-4111-8111-111111111111/approve', {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
  });

  it('CSRFトークンを添えて却下APIを呼び出す', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(followRequestService.reject('11111111-1111-4111-8111-111111111111')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/follow-requests/11111111-1111-4111-8111-111111111111/reject', {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
  });

  it('未認証を専用エラーとして返す', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 401 })));

    await expect(followRequestService.approve('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(FollowRequestUnauthorizedError);
  });

  it('CSRFトークン取得が401でも未認証を専用エラーとして返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(followRequestService.reject('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(FollowRequestUnauthorizedError);
  });
});
