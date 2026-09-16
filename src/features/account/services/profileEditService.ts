import { z } from 'zod';

const csrfTokenResponseSchema = z.object({
  csrf_token: z.string().min(1),
});

const profileEditResponseSchema = z.object({
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
  ui_mode: z.enum(['dark', 'light', 'system']),
});

const tagCandidatesResponseSchema = z.object({
  tags: z.array(z.object({
    tag_identifier: z.string().uuid(),
    tag_name: z.string().min(1),
  })),
});

export type EditableProfile = {
  accountIdentifier: string;
  bio: string;
  favoriteTags: Array<{ identifier: string; label: string }>;
  headerImage: File | null;
  headerImageUrl?: string | null;
  iconImage: File | null;
  iconImageUrl?: string | null;
  name: string;
  socialLinks: Array<{ socialType: string; socialUrl: string }>;
  uiMode: 'dark' | 'light' | 'system';
};

export type TagCandidate = {
  identifier: string;
  label: string;
};

export type ProfileEditAdapter = {
  get: () => Promise<unknown>;
  getCsrfToken: () => Promise<unknown>;
  getTagCandidates: () => Promise<unknown>;
  patch: (body: BodyInit, headers: HeadersInit, method?: 'PATCH' | 'POST') => Promise<Response>;
};

export class ProfileEditUnauthorizedError extends Error {
  constructor() {
    super('Profile editing requires authentication');
    this.name = 'ProfileEditUnauthorizedError';
  }
}

export type ProfileEditService = {
  load: () => Promise<EditableProfile>;
  loadTagCandidates: () => Promise<TagCandidate[]>;
  save: (profile: EditableProfile) => Promise<void>;
};

async function ensureSuccessful(response: Response, operation: string): Promise<void> {
  if (response.status === 401) {
    throw new ProfileEditUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(`Failed to ${operation}: ${response.status}`);
  }
}

const profileEditApiAdapter: ProfileEditAdapter = {
  get: async () => {
    const response = await fetch('/api/my/account', { credentials: 'include', method: 'GET' });
    await ensureSuccessful(response, 'fetch editable profile');
    return response.json();
  },
  getCsrfToken: async () => {
    const response = await fetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
    await ensureSuccessful(response, 'fetch CSRF token');
    return response.json();
  },
  getTagCandidates: async () => {
    const response = await fetch('/api/tags');
    await ensureSuccessful(response, 'fetch tag candidates');
    return response.json();
  },
  patch: async (body, headers, method = 'PATCH') => fetch('/api/my/account', {
    body,
    credentials: 'include',
    headers,
    method,
  }),
};

function toProfilePayload(profile: EditableProfile): string {
  return JSON.stringify({
    account_bio: profile.bio === '' ? null : profile.bio,
    account_name: profile.name,
    favorite_tag_identifiers: profile.favoriteTags.map((tag) => tag.identifier),
    social_links: profile.socialLinks.map((link) => ({
      social_type: link.socialType,
      social_url: link.socialUrl,
    })),
  });
}

function toImagePayload(profile: EditableProfile): FormData | null {
  if (profile.iconImage === null && profile.headerImage === null) return null;

  const body = new FormData();
  if (profile.iconImage !== null) body.append('icon_image', profile.iconImage);
  if (profile.headerImage !== null) body.append('header_image', profile.headerImage);
  body.append('_method', 'PATCH');
  return body;
}

export function createProfileEditService(adapter: ProfileEditAdapter = profileEditApiAdapter): ProfileEditService {
  async function csrfHeaders(contentType?: string): Promise<HeadersInit> {
    const { csrf_token: csrfToken } = csrfTokenResponseSchema.parse(await adapter.getCsrfToken());
    return {
      ...(contentType === undefined ? {} : { 'Content-Type': contentType }),
      'X-CSRF-TOKEN': csrfToken,
    };
  }

  async function patch(body: BodyInit, operation: string, contentType?: string, method?: 'PATCH' | 'POST'): Promise<void> {
    await ensureSuccessful(await adapter.patch(body, await csrfHeaders(contentType), method), operation);
  }

  return {
    load: async () => {
      const profile = profileEditResponseSchema.parse(await adapter.get());

      return {
        accountIdentifier: profile.account_identifier,
        bio: profile.account_bio ?? '',
        favoriteTags: profile.favorite_tags.map((tag) => ({ identifier: tag.tag_identifier, label: tag.tag_name })),
        headerImage: null,
        headerImageUrl: profile.header_image_url,
        iconImage: null,
        iconImageUrl: profile.icon_image_url,
        name: profile.account_name,
        socialLinks: profile.social_links.map((link) => ({ socialType: link.social_type, socialUrl: link.social_url })),
        uiMode: profile.ui_mode,
      };
    },
    loadTagCandidates: async () => tagCandidatesResponseSchema.parse(await adapter.getTagCandidates()).tags.map((tag) => ({
      identifier: tag.tag_identifier,
      label: tag.tag_name,
    })),
    save: async (profile) => {
      await patch(toProfilePayload(profile), 'save editable profile', 'application/json');
      const imagePayload = toImagePayload(profile);
      if (imagePayload !== null) await patch(imagePayload, 'upload profile images', undefined, 'POST');
    },
  };
}

export const profileEditService = createProfileEditService();
