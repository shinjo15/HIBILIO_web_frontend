import { CsrfTokenError, getCsrfToken } from '../../auth/services/authSession';
import { apiFetch } from '../../../shared/api/apiFetch';

export type AccountVisibility = 'private' | 'public';

export type AccountVisibilityService = {
  update: (visibility: AccountVisibility) => Promise<void>;
};

export class AccountVisibilityUnauthorizedError extends Error {
  constructor() {
    super('Account visibility requires authentication');
    this.name = 'AccountVisibilityUnauthorizedError';
  }
}

let inFlightUpdate: Promise<void> | null = null;

export function getInFlightAccountVisibilityUpdate(): Promise<void> | null {
  return inFlightUpdate;
}

export function resetAccountVisibilityServiceForTesting(): void {
  inFlightUpdate = null;
}

export function createAccountVisibilityService(): AccountVisibilityService {
  return {
    update: async (visibility) => {
      if (inFlightUpdate !== null) return inFlightUpdate;

      inFlightUpdate = (async () => {
        try {
          const response = await apiFetch('/api/my/account/visibility', {
            body: JSON.stringify({ visibility }),
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': await getCsrfToken(),
            },
            method: 'PATCH',
          });

          if (response.status === 401) throw new AccountVisibilityUnauthorizedError();
          if (!response.ok) throw new Error(`Failed to change account visibility: ${response.status}`);
        } catch (error) {
          if (error instanceof CsrfTokenError && error.status === 401) throw new AccountVisibilityUnauthorizedError();
          throw error;
        } finally {
          inFlightUpdate = null;
        }
      })();

      return inFlightUpdate;
    },
  };
}

export const accountVisibilityService = createAccountVisibilityService();
