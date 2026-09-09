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

const getMyAccountResponseSchema = z.object({
  account_bio: z.string().nullable(),
  account_identifier: z.string().min(1),
  account_name: z.string().min(1),
  favorite_tags: z.array(z.object({
    tag_identifier: z.string().min(1),
    tag_name: z.string().min(1),
  })),
  social_links: z.array(z.object({
    social_type: z.string().min(1),
    social_url: z.string().url(),
  })),
});

type AccountDummyAdapter = {
  listExecutionHistories: () => Promise<unknown>;
  listPosts: () => Promise<unknown>;
};

type AccountProfileAdapter = {
  getProfile: () => Promise<unknown>;
};

type AccountLikesAdapter = {
  listLikes: () => Promise<unknown>;
};

export class AccountUnauthorizedError extends Error {
  constructor(message = 'Account profile requires authentication') {
    super(message);
    this.name = 'AccountUnauthorizedError';
  }
}

export type AccountService = {
  getExecutionHistory: (executionId: string) => Promise<AccountExecutionHistory | null>;
  getProfile: () => Promise<AccountProfile>;
  listExecutionHistories: () => Promise<AccountExecutionHistory[]>;
  listLikes: () => Promise<LikedRoutine[]>;
  listPosts: () => Promise<AccountPost[]>;
};

const accountDummyAdapter: AccountDummyAdapter = {
  listExecutionHistories: async () => [
    { achievedActions: 5, completedActionIndexes: [0, 1, 2, 3, 4], completed: false, executedAtLabel: '今日', id: 'execution-1', minutes: 75, routineId: 'routine-2', routineTitle: '夜のリラックスルーティン', totalActions: 6 },
    { achievedActions: 4, completedActionIndexes: [0, 1, 3, 4], completed: false, executedAtLabel: '昨日', id: 'execution-2', minutes: 58, routineId: 'routine-1', routineTitle: '朝の集中ルーティン｜平日版', totalActions: 5 },
    { achievedActions: 6, completedActionIndexes: [0, 1, 2, 3, 4, 5], completed: true, executedAtLabel: '2日前', id: 'execution-3', minutes: 80, routineId: 'routine-2', routineTitle: '夜のリラックスルーティン', totalActions: 6 },
  ],
  listPosts: async () => [
    { createdAtLabel: '3日前', executions: 45, id: 'post-1', likes: 23, routineId: 'routine-3', title: '週3筋トレルーティン' },
    { createdAtLabel: '1週間前', executions: 12, id: 'post-2', likes: 8, routineId: 'routine-4', title: '深夜の読書ルーティン' },
  ],
};

const accountProfileApiAdapter: AccountProfileAdapter = {
  getProfile: async () => {
    const response = await fetch('/api/my/account', {
      credentials: 'include',
      method: 'GET',
    });

    if (response.status === 401) {
      throw new AccountUnauthorizedError('Account profile requires authentication');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch account profile: ${response.status}`);
    }

    return response.json();
  },
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
  profileAdapter: AccountProfileAdapter = accountProfileApiAdapter,
): AccountService {
  return {
    getExecutionHistory: async (executionId) => {
      const histories = z.array(accountExecutionHistorySchema).parse(await dummyAdapter.listExecutionHistories());
      return histories.find((history) => history.id === executionId) ?? null;
    },
    getProfile: async () => {
      const profile = getMyAccountResponseSchema.parse(await profileAdapter.getProfile());
      return accountProfileSchema.parse({
        bio: profile.account_bio,
        favoriteTags: profile.favorite_tags.map((tag) => ({ id: tag.tag_identifier, name: tag.tag_name })),
        initial: profile.account_name.charAt(0),
        name: profile.account_name,
        socialLinks: profile.social_links.map((link) => ({ socialType: link.social_type, socialUrl: link.social_url })),
      });
    },
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
