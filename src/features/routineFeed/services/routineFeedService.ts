import { z } from 'zod';
import { followingAccountSchema, routineSchema, type FollowingAccount, type Routine, type RoutineFeedTab } from '../domain/routine';

const numberOfItemsPerPage = 40;

const routineFeedResponseSchema = z.object({
  posts: z.array(z.object({
    account_identifier: z.string().uuid(),
    account_name: z.string().min(1),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
    customization_count: z.number().int().nonnegative(),
    execution_count: z.number().int().nonnegative(),
    liked: z.boolean(),
    post_category: z.enum(['routine', 'action']),
    post_identifier: z.string().min(1),
    post_like_count: z.number().int().nonnegative(),
    post_support_count: z.number().int().nonnegative().optional(),
    posted_at: z.string().datetime({ offset: true }),
    routine_actions: z.array(z.object({
      action_minutes: z.number().int().positive().nullable(),
      action_name: z.string().min(1),
      routine_action_identifier: z.string().min(1),
    })),
    routine_execution_minutes: z.number().int().positive().nullable(),
    routine_identifier: z.string().min(1),
    routine_name: z.string().min(1),
    tags: z.array(z.object({
      tag_identifier: z.string().min(1),
      tag_name: z.string().min(1),
    })),
  })),
  total: z.number().int().nonnegative(),
});

const followingAccountsResponseSchema = z.object({
  following_accounts: z.array(z.object({
    account_bio: z.string().nullable(),
    account_identifier: z.string().min(1),
    account_name: z.string().min(1),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
  })),
});

type RoutineFeedResponse = z.infer<typeof routineFeedResponseSchema>;

export class RoutineFeedUnauthorizedError extends Error {}

export type RoutineFeedAdapter = {
  list: (tab: RoutineFeedTab, page: number) => Promise<unknown>;
  listFollowingAccounts: () => Promise<unknown>;
};

export type RoutineFeedService = {
  list: (tab?: RoutineFeedTab) => Promise<Routine[]>;
  listPage?: (tab: RoutineFeedTab, page: number) => Promise<{ items: Routine[]; total: number }>;
  listFollowingAccounts: () => Promise<FollowingAccount[]>;
};

const paths: Record<RoutineFeedTab, string> = {
  following: '/api/following/posts',
  popular: '/api/posts/popular',
  recommended: '/api/posts/favorite_tags',
};

const routineFeedApiAdapter: RoutineFeedAdapter = {
  list: async (tab, page) => {
    const searchParams = new URLSearchParams({
      number_of_items_per_page: String(numberOfItemsPerPage),
      page: String(page),
    });
    const response = await fetch(`${paths[tab]}?${searchParams}`, {
      credentials: 'include',
      method: 'GET',
    });

    if (response.status === 401) {
      throw new RoutineFeedUnauthorizedError('Routine feed requires authentication');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch routine feed: ${response.status}`);
    }

    return response.json();
  },
  listFollowingAccounts: async () => {
    const response = await fetch('/api/my/following', {
      credentials: 'include',
      method: 'GET',
    });

    if (response.status === 401) {
      throw new RoutineFeedUnauthorizedError('Following accounts require authentication');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch following accounts: ${response.status}`);
    }

    return response.json();
  },
};

function toRoutine(post: RoutineFeedResponse['posts'][number]): Routine {
  return routineSchema.parse({
    accountId: post.account_identifier,
    authorName: post.account_name,
    createdAt: post.posted_at,
    customizations: post.customization_count,
    durationMinutes: post.routine_execution_minutes,
    executions: post.execution_count,
    id: post.post_identifier,
    iconImageUrl: post.icon_image_url,
    liked: post.liked,
    likes: post.post_like_count,
    routineId: post.routine_identifier,
    steps: post.routine_actions.map((action) => ({
      action: action.action_name,
      durationMinutes: action.action_minutes,
    })),
    supports: post.post_support_count,
    tags: post.tags.map((tag) => tag.tag_name),
    title: post.routine_name,
  });
}

export function createRoutineFeedService(adapter: RoutineFeedAdapter = routineFeedApiAdapter): RoutineFeedService & Required<Pick<RoutineFeedService, 'listPage'>> {
  const listPage = async (tab: RoutineFeedTab, page: number) => {
    const response = routineFeedResponseSchema.parse(await adapter.list(tab, page));
    return { items: response.posts.map(toRoutine), total: response.total };
  };

  return {
    list: async (tab = 'recommended') => (await listPage(tab, 1)).items,
    listPage,
    listFollowingAccounts: async () => followingAccountsResponseSchema.parse(await adapter.listFollowingAccounts()).following_accounts.map((account) => followingAccountSchema.parse({
      accountIdentifier: account.account_identifier,
      bio: account.account_bio,
      iconImageUrl: account.icon_image_url,
      name: account.account_name,
    })),
  };
}

export const routineFeedService = createRoutineFeedService();