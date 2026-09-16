import { z } from 'zod';

export const reportCategories = ['spam', 'harassment', 'inappropriate_content', 'impersonation', 'other'] as const;
export type ReportCategory = typeof reportCategories[number];

export type CreateReportInput = {
  category: ReportCategory;
  targetAccountIdentifier: string;
  targetPostIdentifier?: string;
  text: string;
};

export class ReportError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ReportError';
  }
}

export class ReportUnauthorizedError extends ReportError {
  constructor() {
    super('Report requires authentication', 401);
    this.name = 'ReportUnauthorizedError';
  }
}

export type ReportService = { create: (input: CreateReportInput) => Promise<void> };

const csrfTokenSchema = z.object({ csrf_token: z.string().min(1) });

export const reportService: ReportService = {
  create: async ({ category, targetAccountIdentifier, targetPostIdentifier, text }) => {
    const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
    if (!csrfResponse.ok) throw new ReportError('Failed to fetch CSRF token', csrfResponse.status);

    const csrfToken = csrfTokenSchema.parse(await csrfResponse.json()).csrf_token;
    const response = await fetch('/api/reports', {
      body: JSON.stringify({ category, target_account_identifier: targetAccountIdentifier, ...(targetPostIdentifier === undefined ? {} : { target_post_identifier: targetPostIdentifier }), text }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      method: 'POST',
    });

    if (response.status === 401) throw new ReportUnauthorizedError();
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const parsedPayload = z.object({ message: z.string().min(1) }).safeParse(payload);
      throw new ReportError(parsedPayload.success ? parsedPayload.data.message : 'Failed to create report', response.status);
    }
  },
};
