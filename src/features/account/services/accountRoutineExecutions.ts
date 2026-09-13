import { z } from 'zod';
import { accountExecutionSummarySchema, type AccountExecutionSummary } from '../domain/account';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';

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
  return parseAccountRoutineExecutionsPage(response).items;
}

export function parseAccountRoutineExecutionsPage(response: unknown): PageResult<AccountExecutionSummary> {
  const parsed = routineExecutionResponseSchema.parse(response);
  return {
    items: parsed.items.map((item) => accountExecutionSummarySchema.parse({
      executedActionCount: item.executedActionCount,
      id: item.routineExecutionIdentifier,
      memo: item.routineExecutionMemo,
      postedAt: item.postedAt,
      routineId: item.routineIdentifier,
      routineTitle: item.routineName,
      supportCount: item.supportCount,
    })),
    total: parsed.total,
  };
}
