import { enqueueAccountMutation } from '../../../shared/api/accountMutationQueue';
import { apiFetch } from '../../../shared/api/apiFetch';
import { CsrfTokenError, getAuthenticationGeneration, getCsrfToken } from '../../auth/services/authSession';

export type AccountVisibility = 'private' | 'public';

export type AccountVisibilityService = {
  update: (visibility: AccountVisibility, sessionGeneration?: number) => Promise<void>;
};

export class AccountVisibilityUnauthorizedError extends Error {
  constructor() {
    super('Account visibility requires authentication');
    this.name = 'AccountVisibilityUnauthorizedError';
  }
}

export class AccountVisibilitySessionChangedError extends Error {
  constructor() {
    super('Account visibility session changed');
    this.name = 'AccountVisibilitySessionChangedError';
  }
}

const inFlightUpdates = new Map<number, Promise<void>>();

export function getInFlightAccountVisibilityUpdate(sessionGeneration: number): Promise<void> | null {
  return inFlightUpdates.get(sessionGeneration) ?? null;
}

export function resetAccountVisibilityServiceForTesting(): void {
  inFlightUpdates.clear();
}

export function createAccountVisibilityService(): AccountVisibilityService {
  return {
    update: async (visibility, sessionGeneration = getAuthenticationGeneration()) => {
      const inFlightUpdate = inFlightUpdates.get(sessionGeneration);
      if (inFlightUpdate !== undefined) return inFlightUpdate;

      const updating = enqueueAccountMutation(async () => {
        try {
          if (sessionGeneration !== getAuthenticationGeneration()) throw new AccountVisibilitySessionChangedError();
          const csrfToken = await getCsrfToken();
          if (sessionGeneration !== getAuthenticationGeneration()) throw new AccountVisibilitySessionChangedError();
          const response = await apiFetch('/api/my/account/visibility', {
            body: JSON.stringify({ visibility }),
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': csrfToken,
            },
            method: 'PATCH',
          });

          if (response.status === 401) throw new AccountVisibilityUnauthorizedError();
          if (!response.ok) throw new Error(`Failed to change account visibility: ${response.status}`);
        } catch (error) {
          if (error instanceof CsrfTokenError && error.status === 401) throw new AccountVisibilityUnauthorizedError();
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

export const accountVisibilityService = createAccountVisibilityService();
