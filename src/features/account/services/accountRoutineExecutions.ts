import { z } from 'zod';
import { accountExecutionSummarySchema, type AccountExecutionSummary } from '../domain/account';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';

const routineExecutionResponseSchema = z.object({
  items: z.array(z.object({
    executed_action_count: z.number().int().nonnegative(),
    posted_at: z.string().datetime({ offset: true }),
    routine_execution_identifier: z.string().min(1),
    routine_execution_memo: z.string().nullable(),
    routine_identifier: z.string().min(1),
    routine_name: z.string().min(1),
    support_count: z.number().int().nonnegative(),
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
      executedActionCount: item.executed_action_count,
      id: item.routine_execution_identifier,
      memo: item.routine_execution_memo,
      postedAt: item.posted_at,
      routineId: item.routine_identifier,
      routineTitle: item.routine_name,
      supportCount: item.support_count,
    })),
    total: parsed.total,
  };
}
