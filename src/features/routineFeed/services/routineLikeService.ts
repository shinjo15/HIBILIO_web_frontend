import { z } from 'zod';

export class RoutineLikeError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'RoutineLikeError';
  }
}

export class RoutineLikeUnauthorizedError extends RoutineLikeError {
  constructor() {
    super('Routine like requires authentication', 401);
    this.name = 'RoutineLikeUnauthorizedError';
  }
}

export type RoutineLikeService = {
  create: (postIdentifier: string) => Promise<void>;
};

const csrfTokenSchema = z.object({ csrf_token: z.string().min(1) });

export const routineLikeService: RoutineLikeService = {
  create: async (postIdentifier) => {
    const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
    if (!csrfResponse.ok) throw new RoutineLikeError('Failed to fetch CSRF token', csrfResponse.status);

    const csrfToken = csrfTokenSchema.parse(await csrfResponse.json()).csrf_token;
    const response = await fetch('/api/likes', {
      body: JSON.stringify({ post_identifier: postIdentifier }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      method: 'POST',
    });

    if (response.status === 401) throw new RoutineLikeUnauthorizedError();
    if (!response.ok) throw new RoutineLikeError('Failed to create routine like', response.status);
  },
};
