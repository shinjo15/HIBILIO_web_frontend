import { z } from 'zod';
import { apiFetch } from '../../../shared/api/apiFetch';
import { CsrfTokenError, getAuthenticationGeneration, getCsrfToken } from '../../auth/services/authSession';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';

const pageSize = 20;

const notificationSchema = z.object({
  content: z.string(),
  created_at: z.string().datetime({ offset: true }),
  notification_identifier: z.string().uuid(),
  status: z.enum(['read', 'unread']),
});

const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  total: z.number().int().nonnegative(),
});

const announcementSchema = z.object({
  announcement_identifier: z.string().uuid(),
  content: z.string(),
  created_at: z.string().datetime({ offset: true }),
  title: z.string(),
});

const announcementsResponseSchema = z.object({
  announcements: z.array(announcementSchema),
  total: z.number().int().nonnegative(),
});

export type PersonalNotification = {
  content: string;
  createdAt: string;
  id: string;
  status: 'read' | 'unread';
};

export type Announcement = {
  content: string;
  createdAt: string;
  id: string;
  title: string;
};

export class NotificationError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class NotificationUnauthorizedError extends NotificationError {
  constructor() {
    super('Notifications require authentication', 401);
    this.name = 'NotificationUnauthorizedError';
  }
}

export class NotificationAuthenticationChangedError extends NotificationError {
  constructor() {
    super('Authentication changed before notification update');
    this.name = 'NotificationAuthenticationChangedError';
  }
}

export function parseNotificationsPage(response: unknown): PageResult<PersonalNotification> {
  const parsed = notificationsResponseSchema.parse(response);
  return {
    items: parsed.notifications.map((notification) => ({
      content: notification.content,
      createdAt: notification.created_at,
      id: notification.notification_identifier,
      status: notification.status,
    })),
    total: parsed.total,
  };
}

export function parseAnnouncementsPage(response: unknown): PageResult<Announcement> {
  const parsed = announcementsResponseSchema.parse(response);
  return {
    items: parsed.announcements.map((announcement) => ({
      content: announcement.content,
      createdAt: announcement.created_at,
      id: announcement.announcement_identifier,
      title: announcement.title,
    })),
    total: parsed.total,
  };
}

async function getPage<Item>(path: string, parse: (body: unknown) => PageResult<Item>): Promise<PageResult<Item>> {
  const response = await apiFetch(path, { credentials: 'include', method: 'GET' });
  if (response.status === 401) throw new NotificationUnauthorizedError();
  if (!response.ok) throw new NotificationError('Failed to fetch notifications', response.status);
  return parse(await response.json());
}

export type NotificationService = {
  listAnnouncements: (page: number) => Promise<PageResult<Announcement>>;
  listNotifications: (page: number) => Promise<PageResult<PersonalNotification>>;
  markAsRead: (notificationIdentifier: string) => Promise<void>;
};

export const notificationService: NotificationService = {
  listAnnouncements: (page) => getPage(`/api/announcements?page=${page}&number_of_items_per_page=${pageSize}`, parseAnnouncementsPage),
  listNotifications: (page) => getPage(`/api/my/notifications?page=${page}&number_of_items_per_page=${pageSize}`, parseNotificationsPage),
  markAsRead: async (notificationIdentifier) => {
    const authenticationGeneration = getAuthenticationGeneration();
    let csrfToken: string;
    try {
      csrfToken = await getCsrfToken();
    } catch (error) {
      if (error instanceof CsrfTokenError && error.status === 401) throw new NotificationUnauthorizedError();
      throw error;
    }
    if (getAuthenticationGeneration() !== authenticationGeneration) throw new NotificationAuthenticationChangedError();
    const response = await apiFetch(`/api/my/notifications/${notificationIdentifier}/read`, {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': csrfToken },
      method: 'PATCH',
    });
    if (response.status === 401) throw new NotificationUnauthorizedError();
    if (!response.ok) throw new NotificationError('Failed to mark notification as read', response.status);
  },
};
