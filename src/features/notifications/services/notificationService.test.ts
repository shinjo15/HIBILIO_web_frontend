import { describe, expect, it, vi } from 'vitest';
import { markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import {
  NotificationUnauthorizedError,
  notificationService,
  parseAnnouncementsPage,
  parseNotificationsPage,
} from './notificationService';

describe('notificationService', () => {
  it('個別通知とお知らせを実APIの別レスポンスとして解析する', () => {
    expect(parseNotificationsPage({
      notifications: [{
        content: '新しい通知です',
        created_at: '2026-11-10T01:02:03+00:00',
        notification_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        status: 'unread',
      }],
      total: 1,
    })).toEqual({
      items: [{ content: '新しい通知です', createdAt: '2026-11-10T01:02:03+00:00', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'unread' }],
      total: 1,
    });
    expect(parseAnnouncementsPage({
      announcements: [{
        announcement_identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        content: '本文です',
        created_at: '2026-11-10T01:02:03+00:00',
        title: 'お知らせ',
      }],
      total: 1,
    })).toEqual({
      items: [{ content: '本文です', createdAt: '2026-11-10T01:02:03+00:00', id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'お知らせ' }],
      total: 1,
    });
  });

  it('通知一覧の401を認証切れとして区別する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(notificationService.listNotifications(2)).rejects.toBeInstanceOf(NotificationUnauthorizedError);
    expect(fetch).toHaveBeenCalledWith('/api/my/notifications?page=2&number_of_items_per_page=20', {
      credentials: 'include', method: 'GET',
    });
  });

  it('既読操作はCSRFを取得して既存PATCHが成功した時だけ完了する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await notificationService.markAsRead('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/my/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/read', {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
  });

  it('既読操作中に認証が切れた場合も認証切れとして区別する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(notificationService.markAsRead('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).rejects.toBeInstanceOf(NotificationUnauthorizedError);
  });

  it('CSRF取得中のアカウント切替後はPATCHを送信しない', async () => {
    const csrf = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(csrf.promise);
    vi.stubGlobal('fetch', fetchMock);
    markAuthenticated();
    const marking = notificationService.markAsRead('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    markAuthenticated();
    csrf.resolve(new Response(JSON.stringify({ csrf_token: 'old-account-token' }), { status: 200 }));

    await expect(marking).rejects.toThrow('Authentication changed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resetAuthenticationForTesting();
  });
});

function deferred<Value>() {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}
