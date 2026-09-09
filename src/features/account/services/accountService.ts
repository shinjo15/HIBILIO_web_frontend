import { z } from 'zod';
import { parseAccountPosts, parseLikedRoutines } from './accountRoutinePosts';
import {
  accountExecutionHistorySchema,
  accountProfileSchema,
  type AccountExecutionHistory,
  type AccountPost,
  type AccountProfile,
  type LikedRoutine,
} from '../domain/account';

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
};

type AccountPostsAdapter = {
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
    const response = await fetch('/api/my/likes?page=1&number_of_items_per_page=20', {
      credentials: 'include',
      method: 'GET',
    });

    if (response.status === 401) {
      throw new AccountUnauthorizedError('Liked routines require authentication');
    }

    if (!response.ok) {
      throw new Error('Failed to fetch liked routines');
    }

    return response.json();
  },
};

const accountPostsApiAdapter: AccountPostsAdapter = {
  listPosts: async () => {
    const response = await fetch('/api/my/posts?page=1&number_of_items_per_page=20', {
      credentials: 'include',
      method: 'GET',
    });

    if (response.status === 401) {
      throw new AccountUnauthorizedError('Routine posts require authentication');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch routine posts: ${response.status}`);
    }

    return response.json();
  },
};

export function createAccountService(
  dummyAdapter: AccountDummyAdapter = accountDummyAdapter,
  likesAdapter: AccountLikesAdapter = accountLikesApiAdapter,
  profileAdapter: AccountProfileAdapter = accountProfileApiAdapter,
  postsAdapter: AccountPostsAdapter = accountPostsApiAdapter,
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
    listLikes: async () => parseLikedRoutines(await likesAdapter.listLikes()),
    listPosts: async () => parseAccountPosts(await postsAdapter.listPosts()),
  };
}

export const accountService = createAccountService();
