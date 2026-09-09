import { z } from 'zod';
import messages from '../../../shared/message/message.json';
import {
  routineCreateRequestSchema,
  toRoutineCreateRequest,
  type RoutineCreateRequest,
  type RoutineCreateViewModel,
} from '../domain/routineCreate';

const apiErrorSchema = z.object({
  message: z.string().optional(),
});

const csrfTokenResponseSchema = z.object({
  csrf_token: z.string().min(1),
});

export class RoutineCreateApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoutineCreateApiError';
  }
}

export type RoutineCreateAdapter = {
  create: (request: RoutineCreateRequest) => Promise<void>;
};

export type RoutineCreateService = {
  create: (input: RoutineCreateViewModel) => Promise<void>;
};

async function createRoutine(request: RoutineCreateRequest): Promise<void> {
  const csrfResponse = await fetch('/api/csrf-token', {
    credentials: 'include',
    method: 'GET',
  });

  if (!csrfResponse.ok) {
    throw new RoutineCreateApiError(messages.routineCreate.error);
  }

  const csrfToken = csrfTokenResponseSchema.parse(await csrfResponse.json()).csrf_token;
  const response = await fetch('/api/routines', {
    body: JSON.stringify(request),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
    },
    method: 'POST',
  });

  if (response.ok) {
    return;
  }

  const parsedError = apiErrorSchema.safeParse(await response.json().catch(() => ({})));
  throw new RoutineCreateApiError(parsedError.success && parsedError.data.message !== undefined
    ? parsedError.data.message
    : messages.routineCreate.error);
}

export const routineCreateApiAdapter: RoutineCreateAdapter = {
  create: createRoutine,
};

export function createRoutineCreateService(adapter: RoutineCreateAdapter): RoutineCreateService {
  return {
    create: async (input) => {
      const request = routineCreateRequestSchema.parse(toRoutineCreateRequest(input));
      await adapter.create(request);
    },
  };
}

export const routineCreateService = createRoutineCreateService(routineCreateApiAdapter);
