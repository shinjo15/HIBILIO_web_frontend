import { z } from 'zod';

const numberOfItemsPerPage = 40;

const tagResponseSchema = z.object({
  tags: z.array(z.object({
    tag_identifier: z.string().min(1),
    tag_name: z.string().min(1),
  })),
});

const popularTagResponseSchema = z.object({
  tags: z.array(z.object({
    routine_count: z.number().int().nonnegative(),
    tag_identifier: z.string().min(1),
    tag_name: z.string().min(1),
  })),
});

const routineSearchCommonSchema = z.object({
    account_identifier: z.string().min(1),
    account_name: z.string().min(1),
    customization_count: z.number().int().nonnegative(),
    execution_count: z.number().int().nonnegative(),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
    published_at: z.string().datetime({ offset: true }),
    posted_at: z.string().datetime({ offset: true }).nullable(),
    post_identifier: z.string().min(1).nullable(),
    post_like_count: z.number().int().nonnegative().nullable(),
    routine_actions: z.array(z.object({
      action_minutes: z.number().int().nonnegative().nullable(),
      action_name: z.string().min(1),
      routine_action_identifier: z.string().min(1),
    })),
    routine_execution_identifier: z.string().min(1).nullable(),
    routine_execution_minutes: z.number().int().nonnegative().nullable(),
    routine_identifier: z.string().min(1),
    routine_name: z.string().min(1),
    tags: z.array(z.object({ tag_identifier: z.string().min(1), tag_name: z.string().min(1) })),
});

const routineSearchResponseSchema = z.object({
  items: z.array(z.discriminatedUnion('item_type', [
    routineSearchCommonSchema.extend({
      customization_origin: z.object({
        account_name: z.string().min(1),
        icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
        routine_identifier: z.string().min(1),
        routine_name: z.string().min(1),
      }).nullable().optional(),
      item_type: z.literal('routine'),
      liked: z.boolean().nullable(),
    }),
    routineSearchCommonSchema.extend({
      executed_action_count: z.number().int().nonnegative(),
      item_type: z.literal('routine_execution'),
      post_identifier: z.string().min(1),
      post_like_count: z.number().int().nonnegative(),
      posted_at: z.string().datetime({ offset: true }),
      routine_execution_identifier: z.string().min(1),
      routine_execution_memo: z.string().nullable(),
      support_count: z.number().int().nonnegative(),
      supported: z.boolean(),
    }),
  ])),
  total: z.number().int().nonnegative(),
});

const accountSearchResponseSchema = z.object({
  accounts: z.array(z.object({
    account_bio: z.string().nullable(),
    account_identifier: z.string().min(1),
    account_name: z.string().min(1),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
  })),
  total: z.number().int().nonnegative(),
});

export type SearchTab = 'routines' | 'accounts';
export type SearchTag = { identifier: string; label: string };
export type PopularSearchTag = SearchTag & { routineCount: number };
type RoutineSearchResultBase = {
  accountId: string;
  accountName: string;
  customizations: number;
  executions: number;
  iconImageUrl: string | null;
  publishedAt: string;
  postedAt: string | null;
  postId: string | null;
  routineActions: { action: string; durationMinutes: number | null }[];
  routineExecutionId: string | null;
  routineExecutionMinutes: number | null;
  routineId: string;
  routineName: string;
  tags: string[];
};
export type RoutineSearchResult = (RoutineSearchResultBase & {
  customizationOrigin?: { accountName: string; iconImageUrl: string | null; routineId: string; routineName: string } | null; itemType: 'routine'; liked: boolean | null; likes: number | null;
}) | (RoutineSearchResultBase & {
  executedActionCount: number; executionMemo: string | null; itemType: 'routine_execution'; likes: number; postId: string; postedAt: string; routineExecutionId: string; supportCount: number; supported: boolean;
});
export type AccountSearchResult = { accountId: string; accountName: string; bio: string | null; iconImageUrl: string | null };
export type SearchResult = RoutineSearchResult | AccountSearchResult;

export type SearchAdapter = {
  listAllTags: () => Promise<unknown>;
  listPopularTags?: () => Promise<unknown>;
  listTags: () => Promise<unknown>;
  searchAccounts: (accountName: string, page: number, tagIdentifiers: string[]) => Promise<unknown>;
  searchRoutines: (title: string, page: number, tagIdentifiers: string[]) => Promise<unknown>;
};

export type SearchService = {
  listAllTags: () => Promise<SearchTag[]>;
  listPopularTags: () => Promise<PopularSearchTag[]>;
  listTags: () => Promise<SearchTag[]>;
  searchPage: (tab: SearchTab, query: string, page: number, tagIdentifiers?: string[]) => Promise<{ items: SearchResult[]; total: number }>;
};

function createSearchParams(queryName: string, query: string, page: number, tagIdentifiers: string[]) {
  const searchParams = query.length > 0
    ? new URLSearchParams({ [queryName]: query, page: String(page), number_of_items_per_page: String(numberOfItemsPerPage) })
    : new URLSearchParams({ page: String(page), number_of_items_per_page: String(numberOfItemsPerPage) });
  tagIdentifiers.forEach((identifier) => searchParams.append('tag_identifiers[]', identifier));
  return searchParams;
}

const searchApiAdapter: SearchAdapter = {
  listAllTags: async () => {
    const response = await fetch('/api/tags', { credentials: 'include', method: 'GET' });
    if (!response.ok) throw new Error(`Failed to fetch tags: ${response.status}`);
    return response.json();
  },
  listPopularTags: async () => {
    const response = await fetch('/api/tags/popular', { credentials: 'include', method: 'GET' });
    if (!response.ok) throw new Error(`Failed to fetch popular tags: ${response.status}`);
    return response.json();
  },
  listTags: async () => {
    const response = await fetch('/api/tags/pickup', { credentials: 'include', method: 'GET' });
    if (!response.ok) throw new Error(`Failed to fetch tags: ${response.status}`);
    return response.json();
  },
  searchAccounts: async (accountName, page, tagIdentifiers) => {
    const searchParams = createSearchParams('account_name', accountName, page, tagIdentifiers);
    const response = await fetch(`/api/accounts/search?${searchParams}`, { credentials: 'include', method: 'GET' });
    if (!response.ok) throw new Error(`Failed to search accounts: ${response.status}`);
    return response.json();
  },
  searchRoutines: async (title, page, tagIdentifiers) => {
    const searchParams = createSearchParams('title', title, page, tagIdentifiers);
    const response = await fetch(`/api/routines/search?${searchParams}`, { credentials: 'include', method: 'GET' });
    if (!response.ok) throw new Error(`Failed to search routines: ${response.status}`);
    return response.json();
  },
};

export function createSearchService(adapter: SearchAdapter = searchApiAdapter): SearchService {
  function toSearchTags(response: unknown): SearchTag[] {
    return tagResponseSchema.parse(response).tags.map((tag) => ({
      identifier: tag.tag_identifier,
      label: tag.tag_name,
    }));
  }

  async function listAllTags(): Promise<SearchTag[]> {
    return toSearchTags(await adapter.listAllTags());
  }

  async function listPopularTags(): Promise<PopularSearchTag[]> {
    if (typeof adapter.listPopularTags !== 'function') throw new Error('Popular tags adapter is unavailable');
    return popularTagResponseSchema.parse(await adapter.listPopularTags()).tags.map((tag) => ({ identifier: tag.tag_identifier, label: tag.tag_name, routineCount: tag.routine_count }));
  }

  async function listTags(): Promise<SearchTag[]> {
    return toSearchTags(await adapter.listTags());
  }

  async function searchPage(tab: SearchTab, query: string, page: number, tagIdentifiers: string[] = []): Promise<{ items: SearchResult[]; total: number }> {
    if (tab === 'routines') {
      const response = routineSearchResponseSchema.parse(await adapter.searchRoutines(query, page, tagIdentifiers));
      return {
        items: response.items.map((item): RoutineSearchResult => {
          const common = {
            accountId: item.account_identifier,
            accountName: item.account_name,
            customizations: item.customization_count,
            executions: item.execution_count,
            iconImageUrl: item.icon_image_url,
            publishedAt: item.published_at,
            postedAt: item.posted_at,
            postId: item.post_identifier,
            routineActions: item.routine_actions.map((action) => ({ action: action.action_name, durationMinutes: action.action_minutes })),
            routineExecutionId: item.routine_execution_identifier,
            routineExecutionMinutes: item.routine_execution_minutes,
            routineId: item.routine_identifier,
            routineName: item.routine_name,
            tags: item.tags.map((tag) => tag.tag_name),
          };
          return item.item_type === 'routine'
            ? {
              ...common,
              ...(item.customization_origin !== undefined ? {
                customizationOrigin: item.customization_origin === null ? null : {
                  accountName: item.customization_origin.account_name,
                  iconImageUrl: item.customization_origin.icon_image_url,
                  routineId: item.customization_origin.routine_identifier,
                  routineName: item.customization_origin.routine_name,
                },
              } : {}),
              itemType: 'routine',
              liked: item.liked,
              likes: item.post_like_count,
            }
            : { ...common, executedActionCount: item.executed_action_count, executionMemo: item.routine_execution_memo, itemType: 'routine_execution', likes: item.post_like_count, postId: item.post_identifier, postedAt: item.posted_at, routineExecutionId: item.routine_execution_identifier, supportCount: item.support_count, supported: item.supported };
        }),
        total: response.total,
      };
    }

    const response = accountSearchResponseSchema.parse(await adapter.searchAccounts(query, page, tagIdentifiers));
    return {
      items: response.accounts.map((account) => ({ accountId: account.account_identifier, accountName: account.account_name, bio: account.account_bio, iconImageUrl: account.icon_image_url })),
      total: response.total,
    };
  }

  return { listAllTags, listPopularTags, listTags, searchPage };
}

export const searchService = createSearchService();
