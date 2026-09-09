import { z } from 'zod';
import { accountExecutionSummarySchema, type AccountExecutionSummary } from '../domain/account';

const routineExecutionResponseSchema = z.object({
  items: z.array(z.object({
    executedActionCount: z.number().int().nonnegative(),
    postedAt: z.string().datetime({ offset: true }),
    routineExecutionIdentifier: z.string().min(1),
    routineExecutionMemo: z.string().nullable(),
    routineIdentifier: z.string().min(1),
    routineName: z.string().min(1),
    supportCount: z.number().int().nonnegative(),
  })),
  total: z.number().int().nonnegative(),
});

export function parseAccountRoutineExecutions(response: unknown): AccountExecutionSummary[] {
  return routineExecutionResponseSchema.parse(response).items.map((item) => accountExecutionSummarySchema.parse({
    executedActionCount: item.executedActionCount,
    id: item.routineExecutionIdentifier,
    memo: item.routineExecutionMemo,
    postedAt: item.postedAt,
    routineId: item.routineIdentifier,
    routineTitle: item.routineName,
    supportCount: item.supportCount,
  }));
}
