import { z } from 'zod';
import { routineSchema, type Routine } from '../../routineFeed/domain/routine';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';

const routinePostResponseSchema = z.object({
  account_identifier: z.string().min(1),
  account_name: z.string().min(1),
  customization_count: z.number().int().nonnegative(),
  execution_count: z.number().int().nonnegative(),
  post_identifier: z.string().min(1),
  post_like_count: z.number().int().nonnegative(),
  post_support_count: z.number().int().nonnegative(),
  posted_at: z.string().datetime({ offset: true }),
  routine_execution_minutes: z.number().int().positive().nullable(),
  routine_identifier: z.string().min(1),
  routine_name: z.string().min(1),
  tags: z.array(z.object({
    tag_identifier: z.string().min(1),
    tag_name: z.string().min(1),
  })),
  routine_actions: z.array(z.object({
    action_minutes: z.number().int().positive().nullable(),
    action_name: z.string().min(1),
    routine_action_identifier: z.string().min(1),
  })),
});

const accountRoutinePostsResponseSchema = z.object({
  items: z.array(routinePostResponseSchema),
  total: z.number().int().nonnegative(),
});

const accountLikedRoutinePostsResponseSchema = z.object({
  items: z.array(routinePostResponseSchema.extend({
    liked_at: z.string().datetime({ offset: true }),
  })),
  total: z.number().int().nonnegative(),
});

function toRoutine(post: z.infer<typeof routinePostResponseSchema>, liked: boolean): Routine {
  return routineSchema.parse({
    accountId: post.account_identifier,
    authorName: post.account_name,
    createdAt: post.posted_at,
    customizations: post.customization_count,
    durationMinutes: post.routine_execution_minutes,
    executions: post.execution_count,
    id: post.post_identifier,
    liked,
    likes: post.post_like_count,
    routineId: post.routine_identifier,
    steps: post.routine_actions.map((action) => ({ action: action.action_name, durationMinutes: action.action_minutes })),
    supports: post.post_support_count,
    tags: post.tags.map((tag) => tag.tag_name),
    title: post.routine_name,
  });
}

export function parseAccountPosts(response: unknown): Routine[] {
  return parseAccountPostsPage(response).items;
}

export function parseLikedRoutines(response: unknown): Routine[] {
  return parseLikedRoutinesPage(response).items;
}

export function parseAccountPostsPage(response: unknown): PageResult<Routine> {
  const parsed = accountRoutinePostsResponseSchema.parse(response);
  return { items: parsed.items.map((post) => toRoutine(post, false)), total: parsed.total };
}

export function parseLikedRoutinesPage(response: unknown): PageResult<Routine> {
  const parsed = accountLikedRoutinePostsResponseSchema.parse(response);
  return { items: parsed.items.map((post) => toRoutine(post, true)), total: parsed.total };
}
