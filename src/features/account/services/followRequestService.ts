import { z } from 'zod';

export class FollowRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'FollowRequestError';
  }
}

export class FollowRequestUnauthorizedError extends FollowRequestError {
  constructor() {
    super('Follow request action requires authentication', 401);
    this.name = 'FollowRequestUnauthorizedError';
  }
}

export type FollowRequestService = {
  approve: (requestingAccountIdentifier: string) => Promise<void>;
  reject: (requestingAccountIdentifier: string) => Promise<void>;
};

const csrfTokenSchema = z.object({ csrf_token: z.string().min(1) });

async function sendFollowRequestAction(requestingAccountIdentifier: string, action: 'approve' | 'reject'): Promise<void> {
  const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
  if (csrfResponse.status === 401) throw new FollowRequestUnauthorizedError();
  if (!csrfResponse.ok) throw new FollowRequestError('Failed to fetch CSRF token', csrfResponse.status);

  const csrfToken = csrfTokenSchema.parse(await csrfResponse.json()).csrf_token;
  const response = await fetch(`/api/follow-requests/${requestingAccountIdentifier}/${action}`, {
    credentials: 'include',
    headers: { 'X-CSRF-TOKEN': csrfToken },
    method: 'POST',
  });

  if (response.status === 401) throw new FollowRequestUnauthorizedError();
  if (!response.ok) throw new FollowRequestError(`Failed to ${action} follow request`, response.status);
}

export const followRequestService: FollowRequestService = {
  approve: async (requestingAccountIdentifier) => sendFollowRequestAction(requestingAccountIdentifier, 'approve'),
  reject: async (requestingAccountIdentifier) => sendFollowRequestAction(requestingAccountIdentifier, 'reject'),
};
