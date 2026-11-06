import { z } from 'zod';
import { getCsrfToken, CsrfTokenError } from '../features/auth/services/authSession';
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

export type UiModeService = {
  load: () => Promise<UiMode>;
  update: (uiMode: UiMode) => Promise<void>;
};

let inFlightUpdate: Promise<void> | null = null;

export function getInFlightUiModeUpdate(): Promise<void> | null {
  return inFlightUpdate;
}

export function resetUiModeServiceForTesting(): void {
  inFlightUpdate = null;
}

export function createUiModeService(): UiModeService {
  return {
    load: async () => {
      const response = await apiFetch('/api/my/account', { credentials: 'include', method: 'GET' });
      if (response.status === 401) throw new UiModeUnauthorizedError();
      if (!response.ok) throw new Error(`Failed to fetch UI mode: ${response.status}`);
      return uiModeResponseSchema.parse(await response.json()).ui_mode;
    },
    update: async (uiMode) => {
      if (inFlightUpdate !== null) return inFlightUpdate;

      inFlightUpdate = (async () => {
        try {
          const response = await apiFetch('/api/my/account/ui-mode', {
            body: JSON.stringify({ ui_mode: uiMode }),
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': await getCsrfToken(),
            },
            method: 'PATCH',
          });
          if (response.status === 401) throw new UiModeUnauthorizedError();
          if (!response.ok) throw new Error(`Failed to change UI mode: ${response.status}`);
        } catch (error) {
          if (error instanceof CsrfTokenError && error.status === 401) throw new UiModeUnauthorizedError();
          throw error;
        } finally {
          inFlightUpdate = null;
        }
      })();

      return inFlightUpdate;
    },
  };
}

export const uiModeService = createUiModeService();