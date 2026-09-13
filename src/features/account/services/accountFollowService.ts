import { z } from 'zod';

export class AccountFollowError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'AccountFollowError';
  }
}

export class AccountFollowUnauthorizedError extends AccountFollowError {
  constructor() {
    super('Account follow requires authentication', 401);
    this.name = 'AccountFollowUnauthorizedError';
  }
}

export type AccountFollowService = {
  create: (accountIdentifier: string) => Promise<void>;
};

const csrfTokenSchema = z.object({ csrf_token: z.string().min(1) });

export const accountFollowService: AccountFollowService = {
  create: async (accountIdentifier) => {
    const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
    if (!csrfResponse.ok) throw new AccountFollowError('Failed to fetch CSRF token', csrfResponse.status);

    const csrfToken = csrfTokenSchema.parse(await csrfResponse.json()).csrf_token;
    const response = await fetch('/api/follows', {
      body: JSON.stringify({ followed_account_identifier: accountIdentifier }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      method: 'POST',
    });

    if (response.status === 401) throw new AccountFollowUnauthorizedError();
    if (!response.ok) throw new AccountFollowError('Failed to create account follow', response.status);
  },
};
