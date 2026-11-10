import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthenticationStatus, markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import { NotificationsPage } from './NotificationsPage';
import { NotificationUnauthorizedError, type NotificationService, type PersonalNotification } from '../services/notificationService';

const unread = { content: '応援が届きました', createdAt: '2026-11-10T01:02:03+00:00', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'unread' as const };
const read = { ...unread, content: '既読の通知です', status: 'read' as const };

function renderPage(service: NotificationService) {
  markAuthenticated();
  return render(<MemoryRouter><NotificationsPage service={service} /></MemoryRouter>);
}

function serviceWithNotifications(items: PersonalNotification[], markAsRead = vi.fn().mockResolvedValue(undefined), total = items.length): NotificationService {
  return { listAnnouncements: vi.fn().mockResolvedValue({ items: [], total: 0 }), listNotifications: vi.fn().mockResolvedValue({ items, total }), markAsRead };
}

afterEach(() => {
  cleanup();
  resetAuthenticationForTesting();
  vi.restoreAllMocks();
});

describe('NotificationsPage', () => {
  it('通知を表示・スクロールしても既読PATCHせず、ページネーション用observerは維持する', async () => {
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    const observer = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor() { observer(); }
      disconnect() {}
      observe() {}
      unobserve() {}
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
    });
    renderPage(serviceWithNotifications([unread], markAsRead, 2));

    await screen.findByText(unread.content);

    expect(markAsRead).not.toHaveBeenCalled();
    expect(observer).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '既読にする' })).not.toBeInTheDocument();
  });

  it('未読通知行をクリックすると一度だけ既読PATCHし、成功後に既読表示へ更新する', async () => {
    const user = userEvent.setup();
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    renderPage(serviceWithNotifications([unread], markAsRead));

    const notification = await screen.findByRole('button', { name: new RegExp(unread.content) });
    await user.click(notification);

    await waitFor(() => expect(markAsRead).toHaveBeenCalledOnce());
    expect(markAsRead).toHaveBeenCalledWith(unread.id);
    await waitFor(() => expect(notification).not.toHaveClass('notifications-page__item--unread'));
  });

  it('未読通知の操作名に未読状態と日時を含める', async () => {
    renderPage(serviceWithNotifications([unread]));

    const notification = await screen.findByRole('button', { name: new RegExp(`${unread.content}.*未読.*2026`) });

    expect(notification).toHaveAccessibleName(expect.stringContaining('既読にする'));
  });

  it('未読通知行のEnterとSpaceキーで既読PATCHできる', async () => {
    const user = userEvent.setup();
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    renderPage(serviceWithNotifications([unread], markAsRead));

    const notification = await screen.findByRole('button', { name: new RegExp(unread.content) });
    notification.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(1));

    const secondUnread = { ...unread, content: '別の未読通知です', id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    cleanup();
    renderPage(serviceWithNotifications([secondUnread], markAsRead));
    const secondNotification = await screen.findByRole('button', { name: new RegExp(`^${secondUnread.content}`) });
    secondNotification.focus();
    await user.keyboard(' ');
    await waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(2));
    expect(markAsRead).toHaveBeenLastCalledWith(secondUnread.id);
  });

  it('既読通知行は操作できず既読PATCHもしない', async () => {
    const user = userEvent.setup();
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    renderPage(serviceWithNotifications([read], markAsRead));

    expect(await screen.findByText(read.content)).not.toHaveAttribute('role', 'button');
    await user.click(screen.getByText(read.content));
    expect(markAsRead).not.toHaveBeenCalled();
  });

  it('既読通知行のアクセシブル名に既読状態と日時を含める', async () => {
    renderPage(serviceWithNotifications([read]));

    const notification = (await screen.findByText(read.content)).closest('li');

    expect(notification).toHaveAccessibleName(new RegExp(`${read.content}.*既読.*2026`));
  });

  it('同一の未読通知を連続クリックしても完了までPATCHは一度だけ送る', async () => {
    const user = userEvent.setup();
    const marking = deferred<void>();
    const markAsRead = vi.fn().mockReturnValue(marking.promise);
    renderPage(serviceWithNotifications([unread], markAsRead));

    const notification = await screen.findByRole('button', { name: new RegExp(unread.content) });
    await user.click(notification);
    await user.click(notification);
    expect(markAsRead).toHaveBeenCalledOnce();

    marking.resolve();
    await waitFor(() => expect(notification).not.toHaveClass('notifications-page__item--unread'));
  });

  it('既読処理中も行の高さを変えずaria-busyで状態を伝え、完了後に既読表示へ更新する', async () => {
    const user = userEvent.setup();
    const marking = deferred<void>();
    const markAsRead = vi.fn().mockReturnValue(marking.promise);
    renderPage(serviceWithNotifications([unread], markAsRead));

    const notification = await screen.findByRole('button', { name: new RegExp(unread.content) });
    await user.click(notification);

    await waitFor(() => expect(notification).toHaveAttribute('aria-busy', 'true'));
    expect(screen.queryByText('既読にしています…')).not.toBeInTheDocument();
    expect(notification).toHaveClass('notifications-page__item--unread');
    expect(notification).toHaveAttribute('role', 'button');

    marking.resolve();
    await waitFor(() => expect(notification).not.toHaveClass('notifications-page__item--unread'));
    expect(notification).not.toHaveAttribute('aria-busy');
  });

  it('失敗した未読通知は行ごとにエラーを表示し、その行の再クリックで再試行する', async () => {
    const user = userEvent.setup();
    const secondUnread = { ...unread, content: '別の応援が届きました', id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    const markAsRead = vi.fn().mockRejectedValueOnce(new Error('first failure')).mockRejectedValueOnce(new Error('second failure')).mockResolvedValue(undefined);
    renderPage(serviceWithNotifications([unread, secondUnread], markAsRead));

    const first = await screen.findByRole('button', { name: new RegExp(`^${unread.content}`) });
    const second = screen.getByRole('button', { name: new RegExp(`^${secondUnread.content}`) });
    await user.click(first);
    await user.click(second);

    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument();
    await user.click(first);
    await waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(3));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    await user.click(second);
    await waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(4));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('アカウント切替後に遅れて成功・失敗した既読更新は新しい世代の通知状態を変更しない', async () => {
    const user = userEvent.setup();
    const marking = deferred<void>();
    const firstList = deferred<{ items: typeof unread[]; total: number }>();
    const secondList = deferred<{ items: typeof unread[]; total: number }>();
    const service: NotificationService = {
      listAnnouncements: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      listNotifications: vi.fn().mockReturnValueOnce(firstList.promise).mockReturnValueOnce(secondList.promise),
      markAsRead: vi.fn().mockReturnValue(marking.promise),
    };
    renderPage(service);
    firstList.resolve({ items: [unread], total: 1 });
    const oldNotification = await screen.findByRole('button', { name: new RegExp(unread.content) });
    await user.click(oldNotification);
    await waitFor(() => expect(service.markAsRead).toHaveBeenCalledWith(unread.id));

    markAuthenticated();
    await waitFor(() => expect(service.listNotifications).toHaveBeenCalledTimes(2));
    secondList.resolve({ items: [unread], total: 1 });
    const currentNotification = await screen.findByRole('button', { name: new RegExp(unread.content) });
    marking.resolve();
    await act(async () => { await Promise.resolve(); });

    expect(currentNotification).toHaveClass('notifications-page__item--unread');
    expect(getAuthenticationStatus()).toBe('authenticated');
  });

  it('お知らせは既読操作の影響を受けず、行の操作で全文表示する', async () => {
    const user = userEvent.setup();
    const content = `${'あ'.repeat(50)}👨‍👩‍👧‍👦`;
    const service: NotificationService = {
      listAnnouncements: vi.fn().mockResolvedValue({ items: [{ content, createdAt: unread.createdAt, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', title: 'お知らせ' }], total: 1 }),
      listNotifications: vi.fn().mockResolvedValue({ items: [unread], total: 1 }),
      markAsRead: vi.fn(),
    };
    renderPage(service);

    await user.click(screen.getByRole('tab', { name: 'お知らせ' }));
    const announcement = await screen.findByRole('button', { name: 'お知らせ お知らせを全文表示' });
    await user.click(announcement);

    expect(announcement).toHaveTextContent(content);
    expect(service.markAsRead).not.toHaveBeenCalled();
  });

  it('お知らせの展開ボタンは各カードのタイトルと展開状態をアクセシブル名で伝える', async () => {
    const user = userEvent.setup();
    const title = 'システムメンテナンスのお知らせ';
    const service: NotificationService = {
      listAnnouncements: vi.fn().mockResolvedValue({ items: [{ content: '本文です', createdAt: unread.createdAt, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', title }], total: 1 }),
      listNotifications: vi.fn().mockResolvedValue({ items: [unread], total: 1 }),
      markAsRead: vi.fn(),
    };
    renderPage(service);

    await user.click(screen.getByRole('tab', { name: 'お知らせ' }));
    const announcement = await screen.findByRole('button', { name: `${title} お知らせを全文表示` });
    expect(announcement).toHaveAttribute('aria-expanded', 'false');

    await user.click(announcement);

    expect(announcement).toHaveAccessibleName(`${title} お知らせを閉じる`);
    expect(announcement).toHaveAttribute('aria-expanded', 'true');
  });

  it.each([new Error('network failure'), new NotificationUnauthorizedError()])('アカウント切替後に遅れて失敗した既読更新では新しいログインを失効させずエラーも表示しない', async (failure) => {
    const user = userEvent.setup();
    const marking = deferred<void>();
    const firstList = deferred<{ items: typeof unread[]; total: number }>();
    const secondList = deferred<{ items: typeof unread[]; total: number }>();
    const service: NotificationService = {
      listAnnouncements: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      listNotifications: vi.fn().mockReturnValueOnce(firstList.promise).mockReturnValueOnce(secondList.promise),
      markAsRead: vi.fn().mockReturnValue(marking.promise),
    };
    renderPage(service);
    firstList.resolve({ items: [unread], total: 1 });
    await user.click(await screen.findByRole('button', { name: new RegExp(unread.content) }));
    await waitFor(() => expect(service.markAsRead).toHaveBeenCalledOnce());

    markAuthenticated();
    await waitFor(() => expect(service.listNotifications).toHaveBeenCalledTimes(2));
    secondList.resolve({ items: [unread], total: 1 });
    await screen.findByRole('button', { name: new RegExp(unread.content) });
    marking.reject(failure);
    await act(async () => { await Promise.resolve(); });

    expect(getAuthenticationStatus()).toBe('authenticated');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

function deferred<Value>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, reject, resolve };
}