import { enqueueAccountMutation } from '../../../shared/api/accountMutationQueue';
import { apiFetch } from '../../../shared/api/apiFetch';
import { CsrfTokenError, getAuthenticationGeneration, getCsrfToken } from '../../auth/services/authSession';

export class SupportNotificationUnauthorizedError extends Error {
  constructor() {
    super('Support notifications require authentication');
    this.name = 'SupportNotificationUnauthorizedError';
  }
}

export class SupportNotificationSessionChangedError extends Error {
  constructor() {
    super('Support notification session changed');
    this.name = 'SupportNotificationSessionChangedError';
  }
}

export type SupportNotificationService = {
  update: (enabled: boolean, sessionGeneration?: number) => Promise<void>;
};

const inFlightUpdates = new Map<number, Promise<void>>();

export function getInFlightSupportNotificationUpdate(sessionGeneration: number): Promise<void> | null {
  return inFlightUpdates.get(sessionGeneration) ?? null;
}

export function resetSupportNotificationServiceForTesting(): void {
  inFlightUpdates.clear();
}

export function createSupportNotificationService(): SupportNotificationService {
  return {
    update: async (enabled, sessionGeneration = getAuthenticationGeneration()) => {
      const inFlightUpdate = inFlightUpdates.get(sessionGeneration);
      if (inFlightUpdate !== undefined) return inFlightUpdate;

      const updating = enqueueAccountMutation(async () => {
        try {
          if (sessionGeneration !== getAuthenticationGeneration()) throw new SupportNotificationSessionChangedError();
          const csrfToken = await getCsrfToken();
          if (sessionGeneration !== getAuthenticationGeneration()) throw new SupportNotificationSessionChangedError();

          const response = await apiFetch('/api/my/account/support-notifications', {
            body: JSON.stringify({ support_notifications_enabled: enabled }),
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': csrfToken,
            },
            method: 'PATCH',
          });

          if (response.status === 401) throw new SupportNotificationUnauthorizedError();
          if (!response.ok) throw new Error(`Failed to change support notifications: ${response.status}`);
        } catch (error) {
          if (error instanceof CsrfTokenError && error.status === 401) throw new SupportNotificationUnauthorizedError();
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

export const supportNotificationService = createSupportNotificationService();
