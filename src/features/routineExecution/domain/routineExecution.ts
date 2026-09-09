import { z } from 'zod';
import messages from '../../../shared/message/message.json';

const memoSchema = z.string().trim().max(31, messages.routineExecution.validation.memoTooLong);

export const routineExecutionStepDtoSchema = z.object({
  action: z.string().min(1),
  duration: z.string().optional(),
  id: z.string().uuid().optional(),
});

export const routineExecutionDtoSchema = z.object({
  id: z.string().min(1),
  steps: z.array(routineExecutionStepDtoSchema).min(1),
  title: z.string().min(1),
});

export const routineExecutionFormSchema = z.object({
  executedRoutineActionIdentifiers: z.array(z.string().uuid()),
  memo: memoSchema,
  routineIdentifier: z.string().uuid(),
});

export const routineExecutionRequestSchema = z.object({
  executed_routine_action_identifiers: z.array(z.string().uuid()),
  routine_execution_memo: z.string().min(1).max(31).optional(),
  routine_identifier: z.string().uuid(),
});

export type RoutineExecutionDto = z.infer<typeof routineExecutionDtoSchema>;
export type RoutineExecutionStepViewModel = RoutineExecutionDto['steps'][number];
export type RoutineExecutionViewModel = RoutineExecutionDto;
export type RoutineExecutionForm = z.infer<typeof routineExecutionFormSchema>;
export type RoutineExecutionRequest = z.infer<typeof routineExecutionRequestSchema>;
export type RoutineExecutionResultViewModel = {
  achieved: number;
  comment: string;
  elapsedMinutes: number;
  total: number;
};

export function toRoutineExecutionViewModel(input: unknown): RoutineExecutionViewModel {
  return routineExecutionDtoSchema.parse(input);
}

export function toRoutineExecutionRequest(input: unknown): RoutineExecutionRequest {
  const form = routineExecutionFormSchema.parse(input);
  return routineExecutionRequestSchema.parse({
    executed_routine_action_identifiers: form.executedRoutineActionIdentifiers,
    ...(form.memo === '' ? {} : { routine_execution_memo: form.memo }),
    routine_identifier: form.routineIdentifier,
  });
}

export function countAchievedSteps(checked: boolean[]): number {
  return checked.filter(Boolean).length;
}
