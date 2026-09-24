import { z } from 'zod';
import { parseAccountPostsPage, parseLikedRoutinesPage } from './accountRoutinePosts';
import { parseAccountRoutineExecutionsPage } from './accountRoutineExecutions';
import type { Routine } from '../../routineFeed/domain/routine';
import { accountProfileSchema, type AccountExecutionSummary, type AccountProfile } from '../domain/account';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';

const publicAccountResponseSchema = z.object({
  account_bio: z.string().nullable(),
  account_identifier: z.string().min(1),
  account_name: z.string().min(1),
  header_image_url: z.string().url().nullish().transform((url) => url ?? null),
  icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
  visibility: z.enum(['public', 'private']).default('public'),
  favorite_tags: z.array(z.object({
    tag_identifier: z.string().min(1),
    tag_name: z.string().min(1),
  })),
  social_links: z.array(z.object({
    social_type: z.string().min(1),
    social_url: z.string().url(),
  })),
});

type PublicAccountAdapter = {
  get: (accountIdentifier: string) => Promise<unknown | null>;
};

export type PublicAccountService = {
  get: (accountIdentifier: string) => Promise<AccountProfile | null>;
  listExecutionHistories: (accountIdentifier: string) => Promise<AccountExecutionSummary[]>;
  listExecutionHistoriesPage?: (accountIdentifier: string, page: number) => Promise<PageResult<AccountExecutionSummary>>;
  listLikes: (accountIdentifier: string) => Promise<Routine[]>;
  listLikesPage?: (accountIdentifier: string, page: number) => Promise<PageResult<Routine>>;
  listPosts: (accountIdentifier: string) => Promise<Routine[]>;
  listPostsPage?: (accountIdentifier: string, page: number) => Promise<PageResult<Routine>>;
};

const publicAccountApiAdapter: PublicAccountAdapter = {
  get: async (accountIdentifier) => {
    const response = await fetch(`/api/accounts/${accountIdentifier}`, { method: 'GET' });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch public account profile: ${response.status}`);
    }

    return response.json();
  },
};

export function createPublicAccountService(adapter: PublicAccountAdapter = publicAccountApiAdapter): PublicAccountService {
  const listLikesPage = async (accountIdentifier: string, page: number) => fetch(`/api/accounts/${accountIdentifier}/likes?page=${page}&number_of_items_per_page=40`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Failed to fetch public liked routines: ${response.status}`);
      return parseLikedRoutinesPage(await response.json());
    });
  const listExecutionHistoriesPage = async (accountIdentifier: string, page: number) => fetch(`/api/accounts/${accountIdentifier}/routine-executions?page=${page}&number_of_items_per_page=40`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Failed to fetch public routine executions: ${response.status}`);
      return parseAccountRoutineExecutionsPage(await response.json());
    });
  const listPostsPage = async (accountIdentifier: string, page: number) => fetch(`/api/accounts/${accountIdentifier}/posts?page=${page}&number_of_items_per_page=40`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Failed to fetch public routine posts: ${response.status}`);
      return parseAccountPostsPage(await response.json());
    });

  return {
    get: async (accountIdentifier) => {
      const response = await adapter.get(accountIdentifier);

      if (response === null) {
        return null;
      }

      const profile = publicAccountResponseSchema.parse(response);
      if (profile.visibility === 'private') {
        return null;
      }

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
    listLikes: async (accountIdentifier) => (await listLikesPage(accountIdentifier, 1)).items,
    listLikesPage,
    listExecutionHistories: async (accountIdentifier) => (await listExecutionHistoriesPage(accountIdentifier, 1)).items,
    listExecutionHistoriesPage,
    listPosts: async (accountIdentifier) => (await listPostsPage(accountIdentifier, 1)).items,
    listPostsPage,
  };
}

export const publicAccountService = createPublicAccountService();
