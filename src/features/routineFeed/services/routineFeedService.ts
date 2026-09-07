import { z } from 'zod';
import { routineSchema, type Routine, type RoutineFeedTab } from '../domain/routine';

const page = 1;
const numberOfItemsPerPage = 20;

const routineFeedResponseSchema = z.object({
  posts: z.array(z.object({
    account_name: z.string().min(1),
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

type RoutineFeedResponse = z.infer<typeof routineFeedResponseSchema>;

export type RoutineFeedAdapter = {
  list: (tab: RoutineFeedTab) => Promise<unknown>;
};

export type RoutineFeedService = {
  list: (tab?: RoutineFeedTab) => Promise<Routine[]>;
};

const paths: Record<RoutineFeedTab, string> = {
  following: '/api/following/posts',
  popular: '/api/posts/popular',
  recommended: '/api/posts/favorite_tags',
};

const routineFeedApiAdapter: RoutineFeedAdapter = {
  list: async (tab) => {
    const searchParams = new URLSearchParams({
      number_of_items_per_page: String(numberOfItemsPerPage),
      page: String(page),
    });
    const response = await fetch(`${paths[tab]}?${searchParams}`, {
      credentials: 'include',
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch routine feed: ${response.status}`);
    }

    return response.json();
  },
};

function toRoutine(post: RoutineFeedResponse['posts'][number]): Routine {
  return routineSchema.parse({
    authorName: post.account_name,
    createdAt: post.posted_at,
    customizations: post.customization_count,
    durationMinutes: post.routine_execution_minutes,
    executions: post.execution_count,
    id: post.post_identifier,
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

export function createRoutineFeedService(adapter: RoutineFeedAdapter = routineFeedApiAdapter): RoutineFeedService {
  return {
    list: async (tab = 'recommended') => routineFeedResponseSchema.parse(await adapter.list(tab)).posts.map(toRoutine),
  };
}

export const routineFeedService = createRoutineFeedService();