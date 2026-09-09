import { z } from 'zod';

export const accountProfileSchema = z.object({
  bio: z.string().nullable(),
  favoriteTags: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
  initial: z.string().min(1).max(1),
  name: z.string().min(1),
  socialLinks: z.array(z.object({ socialType: z.string().min(1), socialUrl: z.string().url() })),
});

export const accountPostSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  executions: z.number().int().nonnegative(),
  id: z.string().min(1),
  likes: z.number().int().nonnegative(),
  routineId: z.string().min(1),
  title: z.string().min(1),
});

export const accountExecutionHistorySchema = z.object({
  achievedActions: z.number().int().nonnegative(),
  completedActionIndexes: z.array(z.number().int().nonnegative()),
  completed: z.boolean(),
  executedAtLabel: z.string().min(1),
  id: z.string().min(1),
  minutes: z.number().int().nonnegative(),
  routineId: z.string().min(1),
  routineTitle: z.string().min(1),
  totalActions: z.number().int().positive(),
});

export const likedRoutineSchema = z.object({
  authorName: z.string().min(1),
  likedAt: z.string().datetime({ offset: true }),
  postId: z.string().min(1),
  routineId: z.string().min(1),
  supports: z.number().int().nonnegative(),
  title: z.string().min(1),
  totalLikes: z.number().int().nonnegative(),
});

export const accountExecutionSummarySchema = z.object({
  executedActionCount: z.number().int().nonnegative(),
  id: z.string().min(1),
  memo: z.string().nullable(),
  postedAt: z.string().datetime({ offset: true }),
  routineId: z.string().min(1),
  routineTitle: z.string().min(1),
  supportCount: z.number().int().nonnegative(),
});

export type AccountProfile = z.infer<typeof accountProfileSchema>;
export type AccountPost = z.infer<typeof accountPostSchema>;
export type AccountExecutionHistory = z.infer<typeof accountExecutionHistorySchema>;
export type AccountExecutionSummary = z.infer<typeof accountExecutionSummarySchema>;
export type LikedRoutine = z.infer<typeof likedRoutineSchema>;
export type AccountTab = 'posts' | 'likes' | 'executionHistory';
