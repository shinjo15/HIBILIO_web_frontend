import { z } from 'zod';
import {
  accountPostSchema,
  likedRoutineSchema,
  type AccountPost,
  type LikedRoutine,
} from '../domain/account';

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

export function parseAccountPosts(response: unknown): AccountPost[] {
  return accountRoutinePostsResponseSchema.parse(response).items.map((post) => accountPostSchema.parse({
    createdAt: post.posted_at,
    executions: post.execution_count,
    id: post.post_identifier,
    likes: post.post_like_count,
    routineId: post.routine_identifier,
    title: post.routine_name,
  }));
}

export function parseLikedRoutines(response: unknown): LikedRoutine[] {
  return accountLikedRoutinePostsResponseSchema.parse(response).items.map((post) => likedRoutineSchema.parse({
    authorName: post.account_name,
    likedAt: post.liked_at,
    postId: post.post_identifier,
    routineId: post.routine_identifier,
    supports: post.post_support_count,
    title: post.routine_name,
    totalLikes: post.post_like_count,
  }));
}
