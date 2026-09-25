import { z } from 'zod';

export const accountProfileSchema = z.object({
  accountIdentifier: z.string().min(1),
  bio: z.string().nullable(),
  favoriteTags: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
  headerImageUrl: z.string().url().nullable().optional(),
  initial: z.string().min(1).max(1),
  iconImageUrl: z.string().url().nullable().optional(),
  name: z.string().min(1),
  socialLinks: z.array(z.object({ socialType: z.string().min(1), socialUrl: z.string().url() })),
  visibility: z.enum(['public', 'private']),
});

export const accountRelationSchema = z.object({
  accountIdentifier: z.string().min(1),
  bio: z.string().nullable(),
  iconImageUrl: z.string().url().nullable().optional(),
  name: z.string().min(1),
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
  actions: z.array(z.object({
    id: z.string().min(1),
    memo: z.string().nullable(),
    minutes: z.number().int().nonnegative().nullable(),
    name: z.string().min(1),
  })),
  executedAt: z.string().datetime({ offset: true }),
  id: z.string().min(1),
  memo: z.string().nullable(),
  postedAt: z.string().datetime({ offset: true }),
  routineId: z.string().min(1),
  routineMemo: z.string().nullable(),
  routineTitle: z.string().min(1),
  supportCount: z.number().int().nonnegative(),
  tags: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
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
export type AccountRelation = z.infer<typeof accountRelationSchema>;
export type AccountPost = z.infer<typeof accountPostSchema>;
export type AccountExecutionHistory = z.infer<typeof accountExecutionHistorySchema>;
export type AccountExecutionSummary = z.infer<typeof accountExecutionSummarySchema>;
export type LikedRoutine = z.infer<typeof likedRoutineSchema>;
export type AccountTab = 'posts' | 'likes' | 'executionHistory' | 'blockedAccounts' | 'followRequests';
