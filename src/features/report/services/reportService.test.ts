import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportError, reportService } from './reportService';

afterEach(() => vi.unstubAllGlobals());

describe('reportService', () => {
  it('CSRFトークン付きで投稿通報を送信する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await reportService.create({ category: 'spam', targetAccountIdentifier: 'account-1', targetPostIdentifier: 'post-1', text: '' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/reports', { body: JSON.stringify({ category: 'spam', target_account_identifier: 'account-1', target_post_identifier: 'post-1', text: '' }), credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' }, method: 'POST' });
  });

  it('既存通報のエラーメッセージを保持する', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'すでに通報済みです。' }), { status: 409 })));

    await expect(reportService.create({ category: 'spam', targetAccountIdentifier: 'account-1', text: '' })).rejects.toMatchObject<Partial<ReportError>>({ message: 'すでに通報済みです。', status: 409 });
  });
});
