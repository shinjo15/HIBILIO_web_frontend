import { z } from 'zod';
import { apiFetch } from '../../../shared/api/apiFetch';
import messages from '../../../shared/message/message.json';
import { getAuthenticationGeneration } from '../../auth/services/authSession';
import { routineExecutionMemoSchema, toRoutineExecutionViewModel, type RoutineExecutionViewModel } from '../domain/routineExecution';
import { routineDetailService } from '../../routineDetail/services/routineDetailService';
import { notifyRoutineExecutionDraftsChanged } from './routineExecutionDraftList';

const identifierSchema = z.string().uuid();
const draftResponseSchema = z.object({
  items: z.array(z.object({
    executed_routine_action_identifiers: z.array(identifierSchema),
    routine_execution_memo: z.string().nullable(),
    routine_identifier: identifierSchema,
  })),
  total: z.number().int().nonnegative(),
});

export type RoutineExecutionDraft = {
  executedRoutineActionIdentifiers: string[];
  memo: string;
};

export type RoutineExecutionAdapter = {
  complete: (routineId: string) => Promise<void>;
  delete: (routineId: string, authenticationGeneration?: number) => Promise<void>;
  getDraft: (routineId: string) => Promise<RoutineExecutionDraft | null>;
  get: (routineId: string) => Promise<unknown>;
  start: (routineId: string) => Promise<RoutineExecutionDraft>;
  updateAction: (routineId: string, actionId: string, isExecuted: boolean) => Promise<void>;
  updateMemo: (routineId: string, memo: string) => Promise<void>;
};

export type RoutineExecutionService = {
  complete: (routineId: string) => Promise<void>;
  delete: (routineId: string, authenticationGeneration?: number) => Promise<void>;
  getDraft: (routineId: string) => Promise<RoutineExecutionDraft | null>;
  get: (routineId: string) => Promise<RoutineExecutionViewModel | null>;
  start: (routineId: string) => Promise<RoutineExecutionDraft>;
  updateAction: (routineId: string, actionId: string, isExecuted: boolean) => Promise<void>;
  updateMemo: (routineId: string, memo: string) => Promise<void>;
};

export class RoutineExecutionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'RoutineExecutionError';
  }
}

export class RoutineExecutionSessionChangedError extends Error {
  constructor() {
    super('Routine execution session changed');
    this.name = 'RoutineExecutionSessionChangedError';
  }
}

const dummyAdapter: RoutineExecutionAdapter = {
  async complete() {},
  async delete() {},
  async getDraft() {
    return null;
  },
  async get(routineId) {
    const routine = await routineDetailService.get(routineId);

    if (!routine) return null;

    return { id: routine.id, steps: routine.steps, title: routine.title };
  },
  async start() {
    return { executedRoutineActionIdentifiers: [], memo: '' };
  },
  async updateAction() {},
  async updateMemo() {},
};

export function createRoutineExecutionService(adapter: RoutineExecutionAdapter): RoutineExecutionService {
  return {
    complete: (routineId) => runMutation(() => adapter.complete(identifierSchema.parse(routineId))),
    delete: (routineId, authenticationGeneration) => runMutation(() => adapter.delete(identifierSchema.parse(routineId), authenticationGeneration)),
    getDraft: (routineId) => adapter.getDraft(identifierSchema.parse(routineId)),
    get: async (routineId) => {
      const response = await adapter.get(routineId);
      return response === null ? null : toRoutineExecutionViewModel(response);
    },
    start: (routineId) => runMutation(() => adapter.start(identifierSchema.parse(routineId))),
    updateAction: (routineId, actionId, isExecuted) => runMutation(() => adapter.updateAction(
      identifierSchema.parse(routineId), identifierSchema.parse(actionId), isExecuted,
    )),
    updateMemo: (routineId, memo) => runMutation(() => adapter.updateMemo(identifierSchema.parse(routineId), routineExecutionMemoSchema.parse(memo))),
  };
}

async function runMutation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof RoutineExecutionError) throw error;
    throw new RoutineExecutionError(messages.routineExecution.error);
  }
}

function assertCurrentAuthenticationGeneration(authenticationGeneration: number): void {
  if (authenticationGeneration !== getAuthenticationGeneration()) throw new RoutineExecutionSessionChangedError();
}

async function csrfHeaders(authenticationGeneration: number): Promise<HeadersInit> {
  const csrfResponse = await apiFetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
  if (!csrfResponse.ok) throw new RoutineExecutionError(messages.routineExecution.error, csrfResponse.status);
  const csrfToken = z.object({ csrf_token: z.string().min(1) }).parse(await csrfResponse.json()).csrf_token;
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  return { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken };
}

async function requestMutation(path: string, method: 'DELETE' | 'PATCH' | 'POST', body?: unknown, authenticationGeneration = getAuthenticationGeneration()): Promise<Response> {
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  const headers = await csrfHeaders(authenticationGeneration);
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  const response = await apiFetch(path, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    credentials: 'include',
    headers,
    method,
  });
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  if (!response.ok) throw new RoutineExecutionError(messages.routineExecution.error, response.status);
  return response;
}

async function listDrafts(authenticationGeneration = getAuthenticationGeneration()): Promise<z.infer<typeof draftResponseSchema>> {
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  const response = await apiFetch('/api/my/routine-execution-drafts', { credentials: 'include', method: 'GET' });
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  if (!response.ok) throw new RoutineExecutionError(messages.routineExecution.error, response.status);
  const drafts = draftResponseSchema.parse(await response.json());
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  return drafts;
}

function toDraft(item: z.infer<typeof draftResponseSchema>['items'][number]): RoutineExecutionDraft {
  return { executedRoutineActionIdentifiers: item.executed_routine_action_identifiers, memo: item.routine_execution_memo ?? '' };
}

async function startRoutineExecutionDraft(routineId: string): Promise<RoutineExecutionDraft> {
  const authenticationGeneration = getAuthenticationGeneration();
  const existing = await getRoutineExecutionDraft(routineId, authenticationGeneration);
  assertCurrentAuthenticationGeneration(authenticationGeneration);
  if (existing !== null) return existing;

  try {
    await requestMutation('/api/routine-execution-drafts', 'POST', { routine_identifier: routineId }, authenticationGeneration);
    assertCurrentAuthenticationGeneration(authenticationGeneration);
    notifyRoutineExecutionDraftsChanged();
    return { executedRoutineActionIdentifiers: [], memo: '' };
  } catch (error) {
    if (!(error instanceof RoutineExecutionError) || error.status !== 409) throw error;
    const concurrentDraft = await getRoutineExecutionDraft(routineId, authenticationGeneration);
    if (concurrentDraft === null) throw error;
    return concurrentDraft;
  }
}

async function getRoutineExecutionDraft(routineId: string, authenticationGeneration = getAuthenticationGeneration()): Promise<RoutineExecutionDraft | null> {
  const draft = (await listDrafts(authenticationGeneration)).items.find((item) => item.routine_identifier === routineId);
  return draft === undefined ? null : toDraft(draft);
}

export const apiRoutineExecutionAdapter: RoutineExecutionAdapter = {
  complete: (routineId) => requestMutation(`/api/routines/${routineId}/execution-draft/complete`, 'POST').then(() => { notifyRoutineExecutionDraftsChanged(); }),
  delete: (routineId, authenticationGeneration) => requestMutation(`/api/routines/${routineId}/execution-draft`, 'DELETE', undefined, authenticationGeneration).then(() => undefined),
  getDraft: getRoutineExecutionDraft,
  get: dummyAdapter.get,
  start: startRoutineExecutionDraft,
  updateAction: (routineId, actionId, isExecuted) => requestMutation(
    `/api/routines/${routineId}/execution-draft/actions`, 'PATCH',
    { is_executed: isExecuted, routine_action_identifier: actionId },
  ).then(() => undefined),
  updateMemo: (routineId, memo) => requestMutation(
    `/api/routines/${routineId}/execution-draft/memo`, 'PATCH',
    { routine_execution_memo: memo === '' ? null : memo },
  ).then(() => undefined),
};

export const routineExecutionService = createRoutineExecutionService(apiRoutineExecutionAdapter);