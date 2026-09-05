import { z } from 'zod';
import messages from '../../../shared/message/message.json';

const commentSchema = z.string().max(300, messages.routineExecution.validation.commentTooLong);

export const routineExecutionStepDtoSchema = z.object({
  action: z.string().min(1),
  duration: z.string().optional(),
  time: z.string().min(1),
});

export const routineExecutionDtoSchema = z.object({
  id: z.string().min(1),
  steps: z.array(routineExecutionStepDtoSchema).min(1),
  title: z.string().min(1),
});

export const routineExecutionResultSchema = z.object({
  achieved: z.number().int().nonnegative(),
  comment: commentSchema,
  elapsedMinutes: z.number().int().positive(),
  routineId: z.string().min(1),
  total: z.number().int().positive(),
});

export type RoutineExecutionDto = z.infer<typeof routineExecutionDtoSchema>;
export type RoutineExecutionStepViewModel = RoutineExecutionDto['steps'][number];
export type RoutineExecutionViewModel = RoutineExecutionDto;
export type RoutineExecutionResult = z.infer<typeof routineExecutionResultSchema>;
export type RoutineExecutionResultViewModel = RoutineExecutionResult;

export function toRoutineExecutionViewModel(input: unknown): RoutineExecutionViewModel {
  return routineExecutionDtoSchema.parse(input);
}

export function toRoutineExecutionResultViewModel(input: unknown): RoutineExecutionResultViewModel {
  return routineExecutionResultSchema.parse(input);
}

export function countAchievedSteps(checked: boolean[]): number {
  return checked.filter(Boolean).length;
}

export function calculateProgressPercentage(achieved: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((achieved / total) * 100)));
}

export function calculateElapsedMinutes(startTime: number, endTime: number): number {
  return Math.max(1, Math.round((endTime - startTime) / 60000));
}
