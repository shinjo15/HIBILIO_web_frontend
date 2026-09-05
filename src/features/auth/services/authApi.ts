import { z } from 'zod';

const apiErrorSchema = z.object({
  message: z.string().optional(),
});

export class AuthenticationApiError extends Error {}

async function postNoContent(path: string, body: string): Promise<void> {
  const response = await fetch(path, {
    body,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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

export type CreateAccountInput = {
  accountBio: string;
  accountName: string;
  emailAddress: string;
  socialLinks: Array<{
    socialType: 'bereal' | 'discord' | 'instagram' | 'threads' | 'tiktok' | 'twitch' | 'x' | 'youtube';
    socialUrl: string;
  }>;
};

export async function createAccount({ accountBio, accountName, emailAddress, socialLinks }: CreateAccountInput): Promise<void> {
  await postNoContent('/api/accounts', JSON.stringify({
    account_bio: accountBio === '' ? null : accountBio,
    account_name: accountName,
    email_address: emailAddress,
    favorite_tag_identifiers: [],
    social_links: socialLinks.map((socialLink) => ({
      social_type: socialLink.socialType,
      social_url: socialLink.socialUrl,
    })),
  }));
}
