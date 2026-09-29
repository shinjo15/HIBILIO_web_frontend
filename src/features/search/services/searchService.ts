import { z } from 'zod';

const numberOfItemsPerPage = 40;

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
  searchAccounts: (accountName: string, page: number) => Promise<unknown>;
  searchRoutines: (title: string, page: number) => Promise<unknown>;
};

export type SearchService = {
  searchPage: (tab: SearchTab, query: string, page: number) => Promise<{ items: SearchResult[]; total: number }>;
};

const searchApiAdapter: SearchAdapter = {
  searchAccounts: async (accountName, page) => {
    const searchParams = new URLSearchParams({ account_name: accountName, page: String(page), number_of_items_per_page: String(numberOfItemsPerPage) });
    const response = await fetch(`/api/accounts/search?${searchParams}`, { credentials: 'include', method: 'GET' });
    if (!response.ok) throw new Error(`Failed to search accounts: ${response.status}`);
    return response.json();
  },
  searchRoutines: async (title, page) => {
    const searchParams = new URLSearchParams({ title, page: String(page), number_of_items_per_page: String(numberOfItemsPerPage) });
    const response = await fetch(`/api/routines/search?${searchParams}`, { credentials: 'include', method: 'GET' });
    if (!response.ok) throw new Error(`Failed to search routines: ${response.status}`);
    return response.json();
  },
};

export function createSearchService(adapter: SearchAdapter = searchApiAdapter): SearchService {
  async function searchPage(tab: SearchTab, query: string, page: number): Promise<{ items: SearchResult[]; total: number }> {
    if (tab === 'routines') {
      const response = routineSearchResponseSchema.parse(await adapter.searchRoutines(query, page));
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

    const response = accountSearchResponseSchema.parse(await adapter.searchAccounts(query, page));
    return {
      items: response.accounts.map((account) => ({ accountId: account.account_identifier, accountName: account.account_name, bio: account.account_bio, iconImageUrl: account.icon_image_url })),
      total: response.total,
    };
  }

  return { searchPage } as SearchService;
}

export const searchService = createSearchService();
