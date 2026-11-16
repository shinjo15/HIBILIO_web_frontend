import { z } from 'zod';
import { apiFetch } from '../../../shared/api/apiFetch';
import { getAuthenticationGeneration } from '../../auth/services/authSession';
import messages from '../../../shared/message/message.json';

const identifierSchema = z.string().uuid();
const responseSchema = z.object({
  items: z.array(z.object({
    executed_at: z.string().datetime({ offset: true }),
    executed_routine_action_identifiers: z.array(identifierSchema),
    routine_execution_identifier: identifierSchema,
    routine_execution_memo: z.string().nullable(),
    routine_identifier: identifierSchema,
    routine_name: z.string(),
  })),
  total: z.number().int().nonnegative(),
});

export type RoutineExecutionDraftListItem = {
  id: string;
  routineId: string;
  routineName: string;
};

export type RoutineExecutionDraftListState = {
  generation: number;
  items: RoutineExecutionDraftListItem[];
  status: 'error' | 'known' | 'loading' | 'unauthorized';
};

export const routineExecutionDraftsChangedEvent = 'routine-execution-drafts-changed';

let state: RoutineExecutionDraftListState = { generation: -1, items: [], status: 'loading' };
let inFlight: { generation: number; promise: Promise<void>; refreshPending: boolean } | null = null;
const listeners = new Set<() => void>();

function publish(nextState: RoutineExecutionDraftListState): void {
  state = nextState;
  listeners.forEach((listener) => listener());
}

export function getRoutineExecutionDraftListSnapshot(): RoutineExecutionDraftListState {
  return state;
}

export function subscribeToRoutineExecutionDraftList(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshRoutineExecutionDraftList(): Promise<void> {
  const generation = getAuthenticationGeneration();
  if (inFlight?.generation === generation) {
    inFlight.refreshPending = true;
    return inFlight.promise;
  }

  publish({ generation, items: [], status: 'loading' });
  let request: Promise<void> = Promise.resolve();
  request = (async () => {
    try {
      const response = await apiFetch('/api/my/routine-execution-drafts', { credentials: 'include', method: 'GET' });
      if (getAuthenticationGeneration() !== generation) return;
      if (response.status === 401) {
        publish({ generation, items: [], status: 'unauthorized' });
        return;
      }
      if (!response.ok) throw new Error(`Failed to fetch routine execution drafts: ${response.status}`);
      const parsed = responseSchema.parse(await response.json());
      if (getAuthenticationGeneration() !== generation) return;
      if (inFlight?.promise !== request || !inFlight.refreshPending) {
        publish({
          generation,
          items: parsed.items.map((item) => ({ id: item.routine_execution_identifier, routineId: item.routine_identifier, routineName: item.routine_name === '' ? messages.home.unnamedExecutionDraft : item.routine_name })),
          status: 'known',
        });
      }
    } catch {
      if (getAuthenticationGeneration() === generation && (inFlight?.promise !== request || !inFlight.refreshPending)) publish({ generation, items: [], status: 'error' });
    } finally {
      if (inFlight?.promise === request) {
        const shouldRefresh = inFlight.refreshPending && getAuthenticationGeneration() === generation;
        inFlight = null;
        if (shouldRefresh) void refreshRoutineExecutionDraftList();
      }
    }
  })();
  inFlight = { generation, promise: request, refreshPending: false };
  return request;
}

export function notifyRoutineExecutionDraftsChanged(): void {
  if (inFlight?.generation === getAuthenticationGeneration()) inFlight.refreshPending = true;
  window.dispatchEvent(new Event(routineExecutionDraftsChangedEvent));
}

export function removeRoutineExecutionDraft(routineId: string, generation: number): void {
  if (state.generation !== generation || getAuthenticationGeneration() !== generation) return;
  publish({ ...state, items: state.items.filter((item) => item.routineId !== routineId) });
}

export function resetRoutineExecutionDraftListForTesting(): void {
  state = { generation: -1, items: [], status: 'loading' };
  inFlight = null;
}
