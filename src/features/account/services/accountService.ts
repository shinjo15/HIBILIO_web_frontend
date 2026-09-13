import { z } from 'zod';
import { parseAccountPosts, parseLikedRoutines } from './accountRoutinePosts';
import { parseAccountRoutineExecutions } from './accountRoutineExecutions';
import type { Routine } from '../../routineFeed/domain/routine';
import {
  accountProfileSchema,
  accountRelationSchema,
  type AccountExecutionHistory,
  type AccountExecutionSummary,
  type AccountProfile,
  type AccountRelation,
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

const accountRelationListResponseSchema = z.object({
  blocks: z.array(z.object({
    account_bio: z.string().nullable(),
    account_identifier: z.string().min(1),
    account_name: z.string().min(1),
  })),
});

const followingAccountsResponseSchema = z.object({
  following_accounts: accountRelationListResponseSchema.shape.blocks,
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

type AccountFollowsAdapter = {
  listFollowedAccounts: () => Promise<unknown>;
};

type AccountBlocksAdapter = {
  listBlockedAccounts: () => Promise<unknown>;
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
  listBlockedAccounts: () => Promise<AccountRelation[]>;
  listFollowedAccounts: () => Promise<AccountRelation[]>;
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

const accountFollowsApiAdapter: AccountFollowsAdapter = {
  listFollowedAccounts: async () => {
    const response = await fetch('/api/my/following', { credentials: 'include', method: 'GET' });

    if (response.status === 401) {
      throw new AccountUnauthorizedError('Followed accounts require authentication');
    }

    if (!response.ok) {
      throw new Error('Failed to fetch followed accounts');
    }

    return response.json();
  },
};

const accountBlocksApiAdapter: AccountBlocksAdapter = {
  listBlockedAccounts: async () => {
    const response = await fetch('/api/my/blocks', { credentials: 'include', method: 'GET' });

    if (response.status === 401) {
      throw new AccountUnauthorizedError('Blocked accounts require authentication');
    }

    if (!response.ok) {
      throw new Error('Failed to fetch blocked accounts');
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
  followsAdapter: AccountFollowsAdapter = accountFollowsApiAdapter,
  blocksAdapter: AccountBlocksAdapter = accountBlocksApiAdapter,
): AccountService {
  return {
    getExecutionHistory: async () => null,
    getProfile: async () => {
      const profile = getMyAccountResponseSchema.parse(await profileAdapter.getProfile());
      return accountProfileSchema.parse({
        accountIdentifier: profile.account_identifier,
        bio: profile.account_bio,
        favoriteTags: profile.favorite_tags.map((tag) => ({ id: tag.tag_identifier, name: tag.tag_name })),
        initial: profile.account_name.charAt(0),
        name: profile.account_name,
        socialLinks: profile.social_links.map((link) => ({ socialType: link.social_type, socialUrl: link.social_url })),
      });
    },
    listExecutionHistories: async () => parseAccountRoutineExecutions(await executionAdapter.listExecutionHistories()),
    listBlockedAccounts: async () => parseAccountRelations(await blocksAdapter.listBlockedAccounts()),
    listFollowedAccounts: async () => parseAccountRelations({
      blocks: followingAccountsResponseSchema.parse(await followsAdapter.listFollowedAccounts()).following_accounts,
    }),
    listLikes: async () => parseLikedRoutines(await likesAdapter.listLikes()),
    listPosts: async () => parseAccountPosts(await postsAdapter.listPosts()),
  };
}

function parseAccountRelations(response: unknown): AccountRelation[] {
  return accountRelationListResponseSchema.parse(response).blocks.map((account) => accountRelationSchema.parse({
    accountIdentifier: account.account_identifier,
    bio: account.account_bio,
    name: account.account_name,
  }));
}

export const accountService = createAccountService();
