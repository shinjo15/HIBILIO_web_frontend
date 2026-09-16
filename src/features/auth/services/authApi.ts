import { z } from 'zod';

const apiErrorSchema = z.object({
  message: z.string().optional(),
});

const csrfTokenResponseSchema = z.object({
  csrf_token: z.string().min(1),
});

export class AuthenticationApiError extends Error {}

async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/csrf-token', {
    credentials: 'include',
    method: 'GET',
  });

  if (!response.ok) {
    throw new AuthenticationApiError('通信に失敗しました。時間をおいて再度お試しください。');
  }

  return csrfTokenResponseSchema.parse(await response.json()).csrf_token;
}

async function postNoContent(path: string, body: string): Promise<void> {
  const response = await fetch(path, {
    body,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': await getCsrfToken(),
    },
    method: 'POST',
  });

  if (response.ok) {
    return;
  }

  const parsedError = apiErrorSchema.safeParse(await response.json().catch(() => ({})));
  throw new AuthenticationApiError(parsedError.success && parsedError.data.message !== undefined
    ? parsedError.data.message
    : '通信に失敗しました。時間をおいて再度お試しください。');
}

export async function requestLoginPasscode(emailAddress: string): Promise<void> {
  await postNoContent('/api/login-passcodes', JSON.stringify({
    email_address: emailAddress,
  }));
}

export async function verifyLoginPasscode(passcode: string): Promise<void> {
  await postNoContent('/api/login-passcodes/verification', JSON.stringify({
    passcode,
  }));
}

export async function requestRegistrationPasscode(emailAddress: string): Promise<void> {
  await postNoContent('/api/registration-passcodes', JSON.stringify({
    email_address: emailAddress,
  }));
}

export async function verifyRegistrationPasscode(passcode: string): Promise<void> {
  await postNoContent('/api/registration-passcodes/verification', JSON.stringify({
    passcode,
  }));
}

export type CreateAccountInput = {
  accountBio: string;
  accountName: string;
  favoriteTagIdentifiers: string[];
  headerImage: File | null;
  iconImage: File | null;
  socialLinks: Array<{
    socialType: 'bereal' | 'discord' | 'instagram' | 'threads' | 'tiktok' | 'twitch' | 'x' | 'youtube';
    socialUrl: string;
  }>;
};

export async function createAccount({ accountBio, accountName, favoriteTagIdentifiers, headerImage, iconImage, socialLinks }: CreateAccountInput): Promise<void> {
  if (iconImage !== null || headerImage !== null) {
    const body = new FormData();
    body.append('account_name', accountName);
    body.append('account_bio', accountBio);
    socialLinks.forEach((socialLink, index) => {
      body.append(`social_links[${index}][social_type]`, socialLink.socialType);
      body.append(`social_links[${index}][social_url]`, socialLink.socialUrl);
    });
    favoriteTagIdentifiers.forEach((identifier, index) => body.append(`favorite_tag_identifiers[${index}]`, identifier));
    if (iconImage !== null) body.append('icon_image', iconImage);
    if (headerImage !== null) body.append('header_image', headerImage);
    const response = await fetch('/api/accounts', { body, credentials: 'include', headers: { 'X-CSRF-TOKEN': await getCsrfToken() }, method: 'POST' });
    if (response.ok) return;
    const parsedError = apiErrorSchema.safeParse(await response.json().catch(() => ({})));
    throw new AuthenticationApiError(parsedError.success && parsedError.data.message !== undefined ? parsedError.data.message : '通信に失敗しました。時間をおいて再度お試しください。');
  }
  await postNoContent('/api/accounts', JSON.stringify({
    account_bio: accountBio === '' ? null : accountBio,
    account_name: accountName,
    favorite_tag_identifiers: favoriteTagIdentifiers,
    social_links: socialLinks.map((socialLink) => ({
      social_type: socialLink.socialType,
      social_url: socialLink.socialUrl,
    })),
  }));
}
