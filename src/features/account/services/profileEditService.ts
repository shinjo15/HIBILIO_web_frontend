import { z } from 'zod';

const profileEditResponseSchema = z.object({
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
  ui_mode: z.enum(['dark', 'light', 'system']),
});

export type EditableProfile = {
  accountIdentifier: string;
  bio: string;
  favoriteTags: Array<{ identifier: string | null; label: string }>;
  headerImageName: string | null;
  iconImageName: string | null;
  name: string;
  socialLinks: Array<{ socialType: string; socialUrl: string }>;
  uiMode: 'dark' | 'light' | 'system';
};

export type ProfileEditAdapter = {
  get: () => Promise<unknown>;
};

export class ProfileEditUnauthorizedError extends Error {
  constructor() {
    super('Profile editing requires authentication');
    this.name = 'ProfileEditUnauthorizedError';
  }
}

export type ProfileEditService = {
  load: () => Promise<EditableProfile>;
};

const profileEditApiAdapter: ProfileEditAdapter = {
  get: async () => {
    const response = await fetch('/api/my/account', { credentials: 'include', method: 'GET' });

    if (response.status === 401) {
      throw new ProfileEditUnauthorizedError();
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch editable profile: ${response.status}`);
    }

    return response.json();
  },
};

export function createProfileEditService(adapter: ProfileEditAdapter = profileEditApiAdapter): ProfileEditService {
  return {
    load: async () => {
      const profile = profileEditResponseSchema.parse(await adapter.get());

      return {
        accountIdentifier: profile.account_identifier,
        bio: profile.account_bio ?? '',
        favoriteTags: profile.favorite_tags.map((tag) => ({ identifier: tag.tag_identifier, label: tag.tag_name })),
        headerImageName: null,
        iconImageName: null,
        name: profile.account_name,
        socialLinks: profile.social_links.map((link) => ({ socialType: link.social_type, socialUrl: link.social_url })),
        uiMode: profile.ui_mode,
      };
    },
  };
}

export const profileEditService = createProfileEditService();
