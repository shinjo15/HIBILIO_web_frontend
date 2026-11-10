import { enqueueAccountMutation } from '../../../shared/api/accountMutationQueue';
import { apiFetch } from '../../../shared/api/apiFetch';
import { CsrfTokenError, getAuthenticationGeneration, getCsrfToken } from '../../auth/services/authSession';

export class LikeNotificationUnauthorizedError extends Error {
  constructor() {
    super('Like notifications require authentication');
    this.name = 'LikeNotificationUnauthorizedError';
  }
}

export class LikeNotificationSessionChangedError extends Error {
  constructor() {
    super('Like notification session changed');
    this.name = 'LikeNotificationSessionChangedError';
  }
}

export type LikeNotificationService = {
  update: (enabled: boolean, sessionGeneration?: number) => Promise<void>;
};

const inFlightUpdates = new Map<number, Promise<void>>();

export function getInFlightLikeNotificationUpdate(sessionGeneration: number): Promise<void> | null {
  return inFlightUpdates.get(sessionGeneration) ?? null;
}

export function resetLikeNotificationServiceForTesting(): void {
  inFlightUpdates.clear();
}

export function createLikeNotificationService(): LikeNotificationService {
  return {
    update: async (enabled, sessionGeneration = getAuthenticationGeneration()) => {
      const inFlightUpdate = inFlightUpdates.get(sessionGeneration);
      if (inFlightUpdate !== undefined) return inFlightUpdate;

      const updating = enqueueAccountMutation(async () => {
        try {
          if (sessionGeneration !== getAuthenticationGeneration()) throw new LikeNotificationSessionChangedError();
          const csrfToken = await getCsrfToken();
          if (sessionGeneration !== getAuthenticationGeneration()) throw new LikeNotificationSessionChangedError();

          const response = await apiFetch('/api/my/account/like-notifications', {
            body: JSON.stringify({ like_notifications_enabled: enabled }),
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': csrfToken,
            },
            method: 'PATCH',
          });

          if (response.status === 401) throw new LikeNotificationUnauthorizedError();
          if (!response.ok) throw new Error(`Failed to change like notifications: ${response.status}`);
        } catch (error) {
          if (error instanceof CsrfTokenError && error.status === 401) throw new LikeNotificationUnauthorizedError();
          throw error;
        } finally {
          inFlightUpdates.delete(sessionGeneration);
        }
      });
      inFlightUpdates.set(sessionGeneration, updating);

      return updating;
    },
  };
}

export const likeNotificationService = createLikeNotificationService();
