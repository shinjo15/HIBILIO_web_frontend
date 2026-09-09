import { z } from 'zod';
import { parseAccountPosts, parseLikedRoutines } from './accountRoutinePosts';
import { parseAccountRoutineExecutions } from './accountRoutineExecutions';
import type { Routine } from '../../routineFeed/domain/routine';
import {
  accountProfileSchema,
  type AccountExecutionHistory,
  type AccountExecutionSummary,
  type AccountProfile,
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

type AccountExecutionAdapter = {
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
  getProfile: () => Promise<AccountProfile | null>;
  listExecutionHistories: () => Promise<AccountExecutionSummary[]>;
  listLikes: () => Promise<Routine[]>;
  listPosts: () => Promise<Routine[]>;
};

const accountExecutionApiAdapter: AccountExecutionAdapter = {
  listExecutionHistories: async () => {
    const response = await fetch('/api/my/routine-executions?page=1&number_of_items_per_page=20', { credentials: 'include', method: 'GET' });
    if (response.status === 401) throw new AccountUnauthorizedError('Routine executions require authentication');
    if (!response.ok) throw new Error(`Failed to fetch routine executions: ${response.status}`);
    return response.json();
  },
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
  executionAdapter: AccountExecutionAdapter = accountExecutionApiAdapter,
  likesAdapter: AccountLikesAdapter = accountLikesApiAdapter,
  profileAdapter: AccountProfileAdapter = accountProfileApiAdapter,
  postsAdapter: AccountPostsAdapter = accountPostsApiAdapter,
): AccountService {
  return {
    getExecutionHistory: async () => null,
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
    listExecutionHistories: async () => parseAccountRoutineExecutions(await executionAdapter.listExecutionHistories()),
    listLikes: async () => parseLikedRoutines(await likesAdapter.listLikes()),
    listPosts: async () => parseAccountPosts(await postsAdapter.listPosts()),
  };
}

export const accountService = createAccountService();
