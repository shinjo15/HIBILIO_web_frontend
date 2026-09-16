import { z } from 'zod';
import { parseAccountPostsPage, parseLikedRoutinesPage } from './accountRoutinePosts';
import { parseAccountRoutineExecutionsPage } from './accountRoutineExecutions';
import type { Routine } from '../../routineFeed/domain/routine';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';
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
  header_image_url: z.string().url().nullish().transform((url) => url ?? null),
  icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
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
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
  })),
});


type AccountExecutionAdapter = {
  listExecutionHistories: (page?: number) => Promise<unknown>;
};

type AccountPostsAdapter = {
  listPosts: (page?: number) => Promise<unknown>;
};

type AccountProfileAdapter = {
  getProfile: () => Promise<unknown>;
};

type AccountLikesAdapter = {
  listLikes: (page?: number) => Promise<unknown>;
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
  listExecutionHistoriesPage?: (page: number) => Promise<PageResult<AccountExecutionSummary>>;
  listBlockedAccounts: () => Promise<AccountRelation[]>;

  listLikes: () => Promise<Routine[]>;
  listLikesPage?: (page: number) => Promise<PageResult<Routine>>;
  listPosts: () => Promise<Routine[]>;
  listPostsPage?: (page: number) => Promise<PageResult<Routine>>;
};

const accountExecutionApiAdapter: AccountExecutionAdapter = {
  listExecutionHistories: async (page = 1) => {
    const response = await fetch(`/api/my/routine-executions?page=${page}&number_of_items_per_page=40`, { credentials: 'include', method: 'GET' });
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
  listLikes: async (page = 1) => {
    const response = await fetch(`/api/my/likes?page=${page}&number_of_items_per_page=40`, {
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
  listPosts: async (page = 1) => {
    const response = await fetch(`/api/my/posts?page=${page}&number_of_items_per_page=40`, {
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

  blocksAdapter: AccountBlocksAdapter = accountBlocksApiAdapter,
): AccountService {
  const listExecutionHistoriesPage = async (page: number) => parseAccountRoutineExecutionsPage(await executionAdapter.listExecutionHistories(page));
  const listLikesPage = async (page: number) => parseLikedRoutinesPage(await likesAdapter.listLikes(page));
  const listPostsPage = async (page: number) => parseAccountPostsPage(await postsAdapter.listPosts(page));

  return {
    getExecutionHistory: async () => null,
    getProfile: async () => {
      const profile = getMyAccountResponseSchema.parse(await profileAdapter.getProfile());
      return accountProfileSchema.parse({
        accountIdentifier: profile.account_identifier,
        bio: profile.account_bio,
        favoriteTags: profile.favorite_tags.map((tag) => ({ id: tag.tag_identifier, name: tag.tag_name })),
        headerImageUrl: profile.header_image_url,
        initial: profile.account_name.charAt(0),
        iconImageUrl: profile.icon_image_url,
        name: profile.account_name,
        socialLinks: profile.social_links.map((link) => ({ socialType: link.social_type, socialUrl: link.social_url })),
      });
    },
    listExecutionHistories: async () => (await listExecutionHistoriesPage(1)).items,
    listExecutionHistoriesPage,
    listBlockedAccounts: async () => parseAccountRelations(await blocksAdapter.listBlockedAccounts()),

    listLikes: async () => (await listLikesPage(1)).items,
    listLikesPage,
    listPosts: async () => (await listPostsPage(1)).items,
    listPostsPage,
  };
}

function parseAccountRelations(response: unknown): AccountRelation[] {
  return accountRelationListResponseSchema.parse(response).blocks.map((account) => accountRelationSchema.parse({
    accountIdentifier: account.account_identifier,
    bio: account.account_bio,
    iconImageUrl: account.icon_image_url,
    name: account.account_name,
  }));
}

export const accountService = createAccountService();
