import { z } from 'zod';
import {
  accountExecutionHistorySchema,
  accountPostSchema,
  accountProfileSchema,
  likedRoutineSchema,
  type AccountExecutionHistory,
  type AccountPost,
  type AccountProfile,
  type LikedRoutine,
} from '../domain/account';

const getMyLikesResponseSchema = z.object({
  likes: z.array(z.object({
    liked_at: z.string().datetime({ offset: true }),
    post_category: z.string().min(1),
    post_identifier: z.string().min(1),
    post_like_count: z.number().int().nonnegative(),
    post_support_count: z.number().int().nonnegative(),
    routine_identifier: z.string().min(1),
  })),
  total: z.number().int().nonnegative(),
});

type AccountDummyAdapter = {
  getProfile: () => Promise<unknown>;
  listExecutionHistories: () => Promise<unknown>;
  listPosts: () => Promise<unknown>;
};

type AccountLikesAdapter = {
  listLikes: () => Promise<unknown>;
};

export type AccountService = {
  getProfile: () => Promise<AccountProfile>;
  listExecutionHistories: () => Promise<AccountExecutionHistory[]>;
  listLikes: () => Promise<LikedRoutine[]>;
  listPosts: () => Promise<AccountPost[]>;
};

const accountDummyAdapter: AccountDummyAdapter = {
  getProfile: async () => ({
    bio: '夜のルーティンで睡眠の質を改善中。毎日続けることが目標。',
    handle: 'yuki_sleep',
    initial: 'Y',
    name: '山田 由紀',
  }),
  listExecutionHistories: async () => [
    { achievedActions: 5, completed: false, executedAtLabel: '今日', id: 'execution-1', minutes: 75, routineId: 'routine-2', routineTitle: '夜のリラックスルーティン', totalActions: 6 },
    { achievedActions: 4, completed: false, executedAtLabel: '昨日', id: 'execution-2', minutes: 58, routineId: 'routine-1', routineTitle: '朝の集中ルーティン｜平日版', totalActions: 5 },
    { achievedActions: 6, completed: true, executedAtLabel: '2日前', id: 'execution-3', minutes: 80, routineId: 'routine-2', routineTitle: '夜のリラックスルーティン', totalActions: 6 },
  ],
  listPosts: async () => [
    { createdAtLabel: '3日前', executions: 45, id: 'post-1', likes: 23, routineId: 'routine-3', title: '週3筋トレルーティン' },
    { createdAtLabel: '1週間前', executions: 12, id: 'post-2', likes: 8, routineId: 'routine-4', title: '深夜の読書ルーティン' },
  ],
};

const accountLikesApiAdapter: AccountLikesAdapter = {
  listLikes: async () => {
    const response = await fetch('/api/my/likes', {
      credentials: 'include',
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch liked routines');
    }

    return response.json();
  },
};

export function createAccountService(
  dummyAdapter: AccountDummyAdapter = accountDummyAdapter,
  likesAdapter: AccountLikesAdapter = accountLikesApiAdapter,
): AccountService {
  return {
    getProfile: async () => accountProfileSchema.parse(await dummyAdapter.getProfile()),
    listExecutionHistories: async () => z.array(accountExecutionHistorySchema).parse(await dummyAdapter.listExecutionHistories()),
    listLikes: async () => getMyLikesResponseSchema.parse(await likesAdapter.listLikes()).likes.map((like) => likedRoutineSchema.parse({
      likedAt: like.liked_at,
      postCategory: like.post_category,
      postId: like.post_identifier,
      routineId: like.routine_identifier,
      supports: like.post_support_count,
      totalLikes: like.post_like_count,
    })),
    listPosts: async () => z.array(accountPostSchema).parse(await dummyAdapter.listPosts()),
  };
}

export const accountService = createAccountService();
