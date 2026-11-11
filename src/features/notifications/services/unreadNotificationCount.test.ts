import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NotificationCountAuthenticationChangedError,
  NotificationCountUnauthorizedError,
  getUnreadNotificationCount,
} from './unreadNotificationCount';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getUnreadNotificationCount', () => {
  it('Cookie付きGETでログインユーザー自身の未読件数だけを返す', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ unread_count: 121 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getUnreadNotificationCount()).resolves.toBe(121);

    expect(fetchMock).toHaveBeenCalledWith('/api/my/notifications/unread-count', {
      credentials: 'include',
      method: 'GET',
    });
  });

  it('401を認証エラーとして通知し、他の応答形式や負数を表示用件数にしない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 })));
    await expect(getUnreadNotificationCount()).rejects.toBeInstanceOf(NotificationCountUnauthorizedError);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ unread_count: -1 }), { status: 200 })));
    await expect(getUnreadNotificationCount()).rejects.toThrow();
  });

  it('リクエスト中に認証世代が変われば応答を破棄する', async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveResponse = resolve; })));
    let generation = 1;

    const count = getUnreadNotificationCount({
      getAuthenticationGeneration: () => generation,
    });
    generation = 2;
    resolveResponse(new Response(JSON.stringify({ unread_count: 3 }), { status: 200 }));

    await expect(count).rejects.toBeInstanceOf(NotificationCountAuthenticationChangedError);
  });
});
