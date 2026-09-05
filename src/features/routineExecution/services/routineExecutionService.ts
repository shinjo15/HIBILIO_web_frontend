import { z } from 'zod';
import messages from '../../../shared/message/message.json';
import {
  routineExecutionResultSchema,
  toRoutineExecutionResultViewModel,
  toRoutineExecutionViewModel,
  type RoutineExecutionResult,
  type RoutineExecutionResultViewModel,
  type RoutineExecutionViewModel,
} from '../domain/routineExecution';
import { routineDetailService } from '../../routineDetail/services/routineDetailService';

export type RoutineExecutionAdapter = {
  complete: (result: RoutineExecutionResult) => Promise<unknown>;
  get: (routineId: string) => Promise<unknown>;
};

export type RoutineExecutionService = {
  complete: (result: RoutineExecutionResult) => Promise<RoutineExecutionResultViewModel>;
  get: (routineId: string) => Promise<RoutineExecutionViewModel | null>;
};

export class RoutineExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoutineExecutionError';
  }
}

/**
 * This frontend has no local RoutineExecution API implementation. The dummy
 * adapter neither calls an HTTP route nor models a backend request payload.
 * It returns the screen's transient result so the full interaction can be
 * exercised without persistence.
 */
const dummyAdapter: RoutineExecutionAdapter = {
  async complete(result) {
    return result;
  },
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
    complete: async (result) => {
      const validatedResult = routineExecutionResultSchema.parse(result);
      try {
        const response = await adapter.complete(validatedResult);
        return toRoutineExecutionResultViewModel(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
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

export const routineExecutionService = createRoutineExecutionService(dummyAdapter);
