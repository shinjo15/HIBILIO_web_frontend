import { z } from 'zod';
import { apiFetch } from '../../../shared/api/apiFetch';
import messages from '../../../shared/message/message.json';
import {
  routineCreateRequestSchema,
  toRoutineCreateRequest,
  type RoutineCreateRequest,
  type RoutineCreateViewModel,
} from '../domain/routineCreate';

const apiErrorSchema = z.object({
  errors: z.record(z.string(), z.array(z.string()).min(1)).optional(),
  message: z.string().optional(),
});

const csrfTokenResponseSchema = z.object({
  csrf_token: z.string().min(1),
});

const tagCandidatesResponseSchema = z.object({
  tags: z.array(z.object({
    tag_identifier: z.string().uuid(),
    tag_name: z.string().min(1),
  })),
});

const favoriteTagsResponseSchema = z.object({
  favorite_tags: z.array(z.object({
    tag_identifier: z.string().uuid(),
    tag_name: z.string().min(1),
  })),
});

export type RoutineCreateTag = { identifier: string; label: string };

export class RoutineCreateApiError extends Error {
  constructor(message: string, readonly fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'RoutineCreateApiError';
  }
}

export class RoutineCreateUnauthorizedError extends Error {
  constructor() {
    super('Routine creation requires authentication');
    this.name = 'RoutineCreateUnauthorizedError';
  }
}

export type RoutineCreateAdapter = {
  create: (request: RoutineCreateRequest) => Promise<void>;
  getFavoriteTags?: () => Promise<unknown>;
  searchTagCandidates?: (query: string) => Promise<unknown>;
};

export type RoutineCreateService = {
  create: (input: RoutineCreateViewModel) => Promise<void>;
  loadFavoriteTags?: () => Promise<RoutineCreateTag[]>;
  searchTagCandidates?: (query: string) => Promise<RoutineCreateTag[]>;
};

async function createRoutine(request: RoutineCreateRequest): Promise<void> {
  const csrfResponse = await apiFetch('/api/csrf-token', {
    credentials: 'include',
    method: 'GET',
  });

  if (!csrfResponse.ok) {
    throw new RoutineCreateApiError(messages.routineCreate.error);
  }

  const csrfToken = csrfTokenResponseSchema.parse(await csrfResponse.json()).csrf_token;
  const response = await apiFetch('/api/routines', {
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

  if (response.status === 401) {
    throw new RoutineCreateUnauthorizedError();
  }

  const parsedError = apiErrorSchema.safeParse(await response.json().catch(() => ({})));
  const fieldErrors = parsedError.success
    ? Object.fromEntries(Object.entries(parsedError.data.errors ?? {}).map(([field, errors]) => [field, errors[0]]))
    : {};
  throw new RoutineCreateApiError(
    parsedError.success && parsedError.data.message !== undefined
      ? parsedError.data.message
      : messages.routineCreate.error,
    fieldErrors,
  );
}

export const routineCreateApiAdapter: RoutineCreateAdapter = {
  create: createRoutine,
  getFavoriteTags: async () => {
    const response = await apiFetch('/api/my/account', { credentials: 'include', method: 'GET' });
    if (response.status === 401) throw new RoutineCreateUnauthorizedError();
    if (!response.ok) throw new RoutineCreateApiError(messages.routineCreate.tagLoadError);
    return response.json();
  },
  searchTagCandidates: async (query) => {
    const response = await apiFetch(`/api/tags?${new URLSearchParams({ tag_name: query }).toString()}`, {
      credentials: 'include',
      method: 'GET',
    });
    if (!response.ok) throw new RoutineCreateApiError(messages.routineCreate.tagLoadError);
    return response.json();
  },
};

export function createRoutineCreateService(adapter: RoutineCreateAdapter): RoutineCreateService {
  return {
    create: async (input) => {
      const request = routineCreateRequestSchema.parse(toRoutineCreateRequest(input));
      await adapter.create(request);
    },
    loadFavoriteTags: async () => favoriteTagsResponseSchema.parse(await adapter.getFavoriteTags?.()).favorite_tags.map((tag) => ({
      identifier: tag.tag_identifier,
      label: tag.tag_name,
    })),
    searchTagCandidates: async (query) => tagCandidatesResponseSchema.parse(await adapter.searchTagCandidates?.(query)).tags.map((tag) => ({
      identifier: tag.tag_identifier,
      label: tag.tag_name,
    })),
  };
}

export const routineCreateService = createRoutineCreateService(routineCreateApiAdapter);
