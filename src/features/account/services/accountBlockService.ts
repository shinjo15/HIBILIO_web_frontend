import { z } from 'zod';

export class AccountBlockError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'AccountBlockError';
  }
}

export class AccountBlockUnauthorizedError extends AccountBlockError {
  constructor() {
    super('Account block requires authentication', 401);
    this.name = 'AccountBlockUnauthorizedError';
  }
}

export type AccountBlockService = {
  create: (accountIdentifier: string) => Promise<void>;
};

const csrfTokenSchema = z.object({ csrf_token: z.string().min(1) });

export const accountBlockService: AccountBlockService = {
  create: async (accountIdentifier) => {
    const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
    if (!csrfResponse.ok) throw new AccountBlockError('Failed to fetch CSRF token', csrfResponse.status);

    const csrfToken = csrfTokenSchema.parse(await csrfResponse.json()).csrf_token;
    const response = await fetch('/api/blocks', {
      body: JSON.stringify({ blocked_account_identifier: accountIdentifier }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      method: 'POST',
    });

    if (response.status === 401) throw new AccountBlockUnauthorizedError();
    if (!response.ok) throw new AccountBlockError('Failed to create account block', response.status);
  },
};
