import { z } from 'zod';

const numberOfItemsPerPage = 40;

const tagResponseSchema = z.object({
  tags: z.array(z.object({
    tag_identifier: z.string().min(1),
    tag_name: z.string().min(1),
  })),
});

const routineSearchResponseSchema = z.object({
  items: z.array(z.object({
    account_identifier: z.string().min(1),
    account_name: z.string().min(1),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
    item_type: z.enum(['routine', 'routine_execution']),
    published_at: z.string().datetime({ offset: true }),
    routine_execution_identifier: z.string().min(1).nullable(),
    routine_identifier: z.string().min(1),
    routine_name: z.string().min(1),
    tags: z.array(z.object({ tag_identifier: z.string().min(1), tag_name: z.string().min(1) })),
  })),
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
export type RoutineSearchResult = {
  accountId: string;
  accountName: string;
  iconImageUrl: string | null;
  itemType: 'routine' | 'routine_execution';
  publishedAt: string;
  routineExecutionId: string | null;
  routineId: string;
  routineName: string;
  tags: string[];
};
export type AccountSearchResult = { accountId: string; accountName: string; bio: string | null; iconImageUrl: string | null };
export type SearchResult = RoutineSearchResult | AccountSearchResult;

export type SearchAdapter = {
  listAllTags: () => Promise<unknown>;
  listTags: () => Promise<unknown>;
  searchAccounts: (accountName: string, page: number, tagIdentifiers: string[]) => Promise<unknown>;
  searchRoutines: (title: string, page: number, tagIdentifiers: string[]) => Promise<unknown>;
};

export type SearchService = {
  listAllTags: () => Promise<SearchTag[]>;
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

  async function listTags(): Promise<SearchTag[]> {
    return toSearchTags(await adapter.listTags());
  }

  async function searchPage(tab: SearchTab, query: string, page: number, tagIdentifiers: string[] = []): Promise<{ items: SearchResult[]; total: number }> {
    if (tab === 'routines') {
      const response = routineSearchResponseSchema.parse(await adapter.searchRoutines(query, page, tagIdentifiers));
      return {
        items: response.items.map((item) => ({
          accountId: item.account_identifier,
          accountName: item.account_name,
          iconImageUrl: item.icon_image_url,
          itemType: item.item_type,
          publishedAt: item.published_at,
          routineExecutionId: item.routine_execution_identifier,
          routineId: item.routine_identifier,
          routineName: item.routine_name,
          tags: item.tags.map((tag) => tag.tag_name),
        })),
        total: response.total,
      };
    }

    const response = accountSearchResponseSchema.parse(await adapter.searchAccounts(query, page, tagIdentifiers));
    return {
      items: response.accounts.map((account) => ({ accountId: account.account_identifier, accountName: account.account_name, bio: account.account_bio, iconImageUrl: account.icon_image_url })),
      total: response.total,
    };
  }

  return { listAllTags, listTags, searchPage };
}

export const searchService = createSearchService();
