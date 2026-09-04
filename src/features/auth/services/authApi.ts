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

export async function createAccount(accountName: string, emailAddress: string): Promise<void> {
  await postNoContent('/api/accounts', JSON.stringify({
    account_name: accountName,
    email_address: emailAddress,
    favorite_tag_identifiers: [],
    social_links: [],
  }));
}
