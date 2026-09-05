import { z } from 'zod';

export const accountProfileSchema = z.object({
  bio: z.string(),
  handle: z.string().min(1),
  initial: z.string().min(1).max(1),
  name: z.string().min(1),
});

export const accountPostSchema = z.object({
  createdAtLabel: z.string().min(1),
  executions: z.number().int().nonnegative(),
  id: z.string().min(1),
  likes: z.number().int().nonnegative(),
  routineId: z.string().min(1),
  title: z.string().min(1),
});

export const accountExecutionHistorySchema = z.object({
  achievedActions: z.number().int().nonnegative(),
  completed: z.boolean(),
  executedAtLabel: z.string().min(1),
  id: z.string().min(1),
  minutes: z.number().int().nonnegative(),
  routineId: z.string().min(1),
  routineTitle: z.string().min(1),
  totalActions: z.number().int().positive(),
});

export const likedRoutineSchema = z.object({
  likedAt: z.string().datetime({ offset: true }),
  postCategory: z.string().min(1),
  postId: z.string().min(1),
  routineId: z.string().min(1),
  supports: z.number().int().nonnegative(),
  totalLikes: z.number().int().nonnegative(),
});

export type AccountProfile = z.infer<typeof accountProfileSchema>;
export type AccountPost = z.infer<typeof accountPostSchema>;
export type AccountExecutionHistory = z.infer<typeof accountExecutionHistorySchema>;
export type LikedRoutine = z.infer<typeof likedRoutineSchema>;
export type AccountTab = 'posts' | 'likes' | 'executionHistory';
