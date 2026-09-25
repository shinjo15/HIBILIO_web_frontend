import { z } from 'zod';
import { parseAccountPostsPage, parseLikedRoutinesPage } from './accountRoutinePosts';
import { parseAccountRoutineExecutionsPage } from './accountRoutineExecutions';
import type { Routine } from '../../routineFeed/domain/routine';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';
import {
  accountExecutionHistorySchema,
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
  visibility: z.enum(['public', 'private']),
});

const accountRelationListResponseSchema = z.object({
  blocks: z.array(z.object({
    account_bio: z.string().nullable(),
    account_identifier: z.string().min(1),
    account_name: z.string().min(1),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
  })),
});

const accountExecutionHistoryResponseSchema = z.object({
  executed_at: z.string().datetime({ offset: true }),
  posted_at: z.string().datetime({ offset: true }),
  routine_execution_actions: z.array(z.object({
    action_memo: z.string().nullable(),
    action_minutes: z.number().int().nonnegative().nullable(),
    action_name: z.string().min(1),
    routine_action_identifier: z.string().min(1),
  })),
  routine_execution_identifier: z.string().min(1),
  routine_execution_memo: z.string().nullable(),
  routine_identifier: z.string().min(1),
  routine_memo: z.string().nullable(),
  routine_name: z.string().min(1),
  support_count: z.number().int().nonnegative(),
  tags: z.array(z.object({ tag_identifier: z.string().min(1), tag_name: z.string().min(1) })),
});

type AccountExecutionAdapter = {
  getExecutionHistory: (executionId: string) => Promise<unknown | null>;
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

type ReceivedFollowRequestsAdapter = {
  listReceivedFollowRequests: () => Promise<unknown>;
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
  listReceivedFollowRequests: () => Promise<AccountRelation[]>;

  listLikes: () => Promise<Routine[]>;
  listLikesPage?: (page: number) => Promise<PageResult<Routine>>;
  listPosts: () => Promise<Routine[]>;
  listPostsPage?: (page: number) => Promise<PageResult<Routine>>;
};

const accountExecutionApiAdapter: AccountExecutionAdapter = {
  getExecutionHistory: async (executionId) => {
    const response = await fetch(`/api/routine-executions/${executionId}`, { credentials: 'include', method: 'GET' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to fetch routine execution details: ${response.status}`);
    return response.json();
  },
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

const receivedFollowRequestsResponseSchema = z.object({
  follow_requests: z.array(z.object({
    account_bio: z.string().nullable(),
    account_identifier: z.string().min(1),
    account_name: z.string().min(1),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
  })),
});

const receivedFollowRequestsApiAdapter: ReceivedFollowRequestsAdapter = {
  listReceivedFollowRequests: async () => {
    const response = await fetch('/api/my/follow-requests', { credentials: 'include', method: 'GET' });

    if (response.status === 401) {
      throw new AccountUnauthorizedError('Received follow requests require authentication');
    }

    if (!response.ok) {
      throw new Error('Failed to fetch received follow requests');
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
  receivedFollowRequestsAdapter: ReceivedFollowRequestsAdapter = receivedFollowRequestsApiAdapter,
): AccountService {
  const listExecutionHistoriesPage = async (page: number) => parseAccountRoutineExecutionsPage(await executionAdapter.listExecutionHistories(page));
  const listLikesPage = async (page: number) => parseLikedRoutinesPage(await likesAdapter.listLikes(page));
  const listPostsPage = async (page: number) => parseAccountPostsPage(await postsAdapter.listPosts(page));

  return {
    getExecutionHistory: async (executionId) => {
      const response = await executionAdapter.getExecutionHistory(executionId);
      if (response === null) return null;
      const history = accountExecutionHistoryResponseSchema.parse(response);
      return accountExecutionHistorySchema.parse({
        actions: history.routine_execution_actions.map((action) => ({
          id: action.routine_action_identifier,
          memo: action.action_memo,
          minutes: action.action_minutes,
          name: action.action_name,
        })),
        executedAt: history.executed_at,
        id: history.routine_execution_identifier,
        memo: history.routine_execution_memo,
        postedAt: history.posted_at,
        routineId: history.routine_identifier,
        routineMemo: history.routine_memo,
        routineTitle: history.routine_name,
        supportCount: history.support_count,
        tags: history.tags.map((tag) => ({ id: tag.tag_identifier, name: tag.tag_name })),
      });
    },
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
        visibility: profile.visibility,
      });
    },
    listExecutionHistories: async () => (await listExecutionHistoriesPage(1)).items,
    listExecutionHistoriesPage,
    listBlockedAccounts: async () => parseAccountRelations(await blocksAdapter.listBlockedAccounts()),
    listReceivedFollowRequests: async () => receivedFollowRequestsResponseSchema.parse(await receivedFollowRequestsAdapter.listReceivedFollowRequests()).follow_requests.map((account) => accountRelationSchema.parse({
      accountIdentifier: account.account_identifier,
      bio: account.account_bio,
      iconImageUrl: account.icon_image_url,
      name: account.account_name,
    })),

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
