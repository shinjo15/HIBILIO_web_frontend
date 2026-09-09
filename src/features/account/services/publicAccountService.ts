import { z } from 'zod';
import { accountProfileSchema, type AccountProfile } from '../domain/account';

const publicAccountResponseSchema = z.object({
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

type PublicAccountAdapter = {
  get: (accountIdentifier: string) => Promise<unknown | null>;
};

export type PublicAccountService = {
  get: (accountIdentifier: string) => Promise<AccountProfile | null>;
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
  return {
    get: async (accountIdentifier) => {
      const response = await adapter.get(accountIdentifier);

      if (response === null) {
        return null;
      }

      const profile = publicAccountResponseSchema.parse(response);
      return accountProfileSchema.parse({
        bio: profile.account_bio,
        favoriteTags: profile.favorite_tags.map((tag) => ({ id: tag.tag_identifier, name: tag.tag_name })),
        initial: profile.account_name.charAt(0),
        name: profile.account_name,
        socialLinks: profile.social_links.map((link) => ({ socialType: link.social_type, socialUrl: link.social_url })),
      });
    },
  };
}

export const publicAccountService = createPublicAccountService();
