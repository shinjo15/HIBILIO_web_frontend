import { z } from 'zod';
import { apiFetch } from '../../../shared/api/apiFetch';
import { getAuthenticationGeneration } from '../../auth/services/authSession';

export const unreadNotificationCountChangedEvent = 'unread-notification-count-changed';

const unreadNotificationCountResponseSchema = z.object({
  unread_count: z.number().int().nonnegative(),
});

export class NotificationCountError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'NotificationCountError';
  }
}

export class NotificationCountUnauthorizedError extends NotificationCountError {
  constructor() {
    super('Unread notification count requires authentication', 401);
    this.name = 'NotificationCountUnauthorizedError';
  }
}

export class NotificationCountAuthenticationChangedError extends NotificationCountError {
  constructor() {
    super('Authentication changed before unread notification count completed');
    this.name = 'NotificationCountAuthenticationChangedError';
  }
}

type GetUnreadNotificationCountOptions = {
  getAuthenticationGeneration?: () => number;
};

export async function getUnreadNotificationCount({
  getAuthenticationGeneration: currentAuthenticationGeneration = getAuthenticationGeneration,
}: GetUnreadNotificationCountOptions = {}): Promise<number> {
  const authenticationGeneration = currentAuthenticationGeneration();
  const response = await apiFetch('/api/my/notifications/unread-count', { credentials: 'include', method: 'GET' });
  if (currentAuthenticationGeneration() !== authenticationGeneration) throw new NotificationCountAuthenticationChangedError();
  if (response.status === 401) throw new NotificationCountUnauthorizedError();
  if (!response.ok) throw new NotificationCountError('Failed to fetch unread notification count', response.status);

  return unreadNotificationCountResponseSchema.parse(await response.json()).unread_count;
}
