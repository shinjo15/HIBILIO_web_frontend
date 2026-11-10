import { z } from 'zod';
import { getAuthenticationGeneration, getCsrfToken, CsrfTokenError } from '../features/auth/services/authSession';
import { enqueueAccountMutation } from '../shared/api/accountMutationQueue';
import { apiFetch } from '../shared/api/apiFetch';

export type UiMode = 'dark' | 'light' | 'system';

const uiModeResponseSchema = z.object({
  ui_mode: z.enum(['dark', 'light', 'system']),
});

export class UiModeUnauthorizedError extends Error {
  constructor() {
    super('UI mode requires authentication');
    this.name = 'UiModeUnauthorizedError';
  }
}

export class UiModeSessionChangedError extends Error {
  constructor() {
    super('UI mode session changed');
    this.name = 'UiModeSessionChangedError';
  }
}

export type UiModeService = {
  load: (sessionGeneration?: number) => Promise<UiMode>;
  update: (uiMode: UiMode, sessionGeneration?: number) => Promise<void>;
};

const inFlightLoads = new Map<number, Promise<UiMode>>();
const inFlightUpdates = new Map<number, Promise<void>>();

export function getInFlightUiModeUpdate(sessionGeneration: number): Promise<void> | null {
  return inFlightUpdates.get(sessionGeneration) ?? null;
}

export function resetUiModeServiceForTesting(): void {
  inFlightLoads.clear();
  inFlightUpdates.clear();
}

export function createUiModeService(): UiModeService {
  return {
    load: async (sessionGeneration = getAuthenticationGeneration()) => {
      const inFlightLoad = inFlightLoads.get(sessionGeneration);
      if (inFlightLoad !== undefined) return inFlightLoad;

      const loading = (async () => {
        try {
          const response = await apiFetch('/api/my/account', { credentials: 'include', method: 'GET' });
          if (response.status === 401) throw new UiModeUnauthorizedError();
          if (!response.ok) throw new Error(`Failed to fetch UI mode: ${response.status}`);
          return uiModeResponseSchema.parse(await response.json()).ui_mode;
        } finally {
          inFlightLoads.delete(sessionGeneration);
        }
      })();
      inFlightLoads.set(sessionGeneration, loading);

      return loading;
    },
    update: async (uiMode, sessionGeneration = getAuthenticationGeneration()) => {
      const inFlightUpdate = inFlightUpdates.get(sessionGeneration);
      if (inFlightUpdate !== undefined) return inFlightUpdate;

      const updating = enqueueAccountMutation(async () => {
        try {
          if (sessionGeneration !== getAuthenticationGeneration()) throw new UiModeSessionChangedError();
          const csrfToken = await getCsrfToken();
          if (sessionGeneration !== getAuthenticationGeneration()) throw new UiModeSessionChangedError();
          const response = await apiFetch('/api/my/account/ui-mode', {
            body: JSON.stringify({ ui_mode: uiMode }),
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': csrfToken,
            },
            method: 'PATCH',
          });
          if (response.status === 401) throw new UiModeUnauthorizedError();
          if (!response.ok) throw new Error(`Failed to change UI mode: ${response.status}`);
        } catch (error) {
          if (error instanceof CsrfTokenError && error.status === 401) throw new UiModeUnauthorizedError();
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

export const uiModeService = createUiModeService();