import { z } from 'zod';
import messages from '../../../shared/message/message.json';
import {
  routineExecutionRequestSchema,
  toRoutineExecutionRequest,
  toRoutineExecutionViewModel,
  type RoutineExecutionForm,
  type RoutineExecutionRequest,
  type RoutineExecutionViewModel,
} from '../domain/routineExecution';
import { routineDetailService } from '../../routineDetail/services/routineDetailService';

export type RoutineExecutionAdapter = {
  create: (request: RoutineExecutionRequest) => Promise<void>;
  get: (routineId: string) => Promise<unknown>;
};

export type RoutineExecutionService = {
  create: (input: RoutineExecutionForm) => Promise<void>;
  get: (routineId: string) => Promise<RoutineExecutionViewModel | null>;
};

export class RoutineExecutionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'RoutineExecutionError';
  }
}

const dummyAdapter: RoutineExecutionAdapter = {
  async create() {},
  async get(routineId) {
    const routine = await routineDetailService.get(routineId);

    if (!routine) {
      return null;
    }

    return {
      id: routine.id,
      steps: routine.steps,
      title: routine.title,
    };
  },
};

export function createRoutineExecutionService(adapter: RoutineExecutionAdapter): RoutineExecutionService {
  return {
    create: async (input) => {
      const request = routineExecutionRequestSchema.parse(toRoutineExecutionRequest(input));
      try {
        await adapter.create(request);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw error;
        }
        if (error instanceof RoutineExecutionError) {
          throw error;
        }
        throw new RoutineExecutionError(messages.routineExecution.error);
      }
    },
    get: async (routineId) => {
      const response = await adapter.get(routineId);
      return response === null ? null : toRoutineExecutionViewModel(response);
    },
  };
}

async function createRoutineExecution(request: RoutineExecutionRequest): Promise<void> {
  const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
  if (!csrfResponse.ok) {
    throw new RoutineExecutionError(messages.routineExecution.error);
  }

  const csrfToken = z.object({ csrf_token: z.string().min(1) }).parse(await csrfResponse.json()).csrf_token;
  const response = await fetch('/api/routine-executions', {
    body: JSON.stringify(request),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
    method: 'POST',
  });
  if (!response.ok) {
    throw new RoutineExecutionError(messages.routineExecution.error, response.status);
  }
}

export const apiRoutineExecutionAdapter: RoutineExecutionAdapter = {
  create: createRoutineExecution,
  get: dummyAdapter.get,
};

export const routineExecutionService = createRoutineExecutionService(apiRoutineExecutionAdapter);
