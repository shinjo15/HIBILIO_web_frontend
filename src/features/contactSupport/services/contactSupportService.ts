import { z } from 'zod';

const csrfTokenSchema = z.object({ csrf_token: z.string().min(1) });
const validationErrorSchema = z.object({ errors: z.record(z.string(), z.array(z.string())) });

export type ContactSupportInput = {
  content: string;
  title: string;
};

export type ContactSupportValidationError = 'contentRequired' | 'contentTooLong' | 'titleNewline' | 'titleRequired' | 'titleTooLong';

function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function validateContactSupport({ content, title }: ContactSupportInput): Partial<Record<'content' | 'title', ContactSupportValidationError>> {
  if (title.trim() === '') return { title: 'titleRequired' };
  if (codePointLength(title) > 50) return { title: 'titleTooLong' };
  if (/[\r\n\u2028\u2029]/.test(title)) return { title: 'titleNewline' };
  if (content.trim() === '') return { content: 'contentRequired' };
  if (codePointLength(content) > 500) return { content: 'contentTooLong' };
  return {};
}

export type ContactSupportAdapter = {
  create: (input: ContactSupportInput) => Promise<void>;
};

export class ContactSupportError extends Error {
  constructor(message: string, readonly status?: number, readonly fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ContactSupportError';
  }
}

export const contactSupportApiAdapter: ContactSupportAdapter = {
  create: async ({ content, title }) => {
    const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
    if (!csrfResponse.ok) throw new ContactSupportError('Failed to fetch CSRF token', csrfResponse.status);

    const csrfToken = csrfTokenSchema.parse(await csrfResponse.json()).csrf_token;
    const response = await fetch('/api/contact-support', {
      body: JSON.stringify({ content, title }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      method: 'POST',
    });

    if (response.status === 204) return;

    const parsedError = validationErrorSchema.safeParse(await response.json().catch(() => null));
    throw new ContactSupportError(
      'Failed to submit contact support request',
      response.status,
      parsedError.success ? parsedError.data.errors : undefined,
    );
  },
};

export type ContactSupportService = ContactSupportAdapter;
export const contactSupportService = contactSupportApiAdapter;
