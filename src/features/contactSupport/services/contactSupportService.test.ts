import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContactSupportError, contactSupportApiAdapter, validateContactSupport } from './contactSupportService';

afterEach(() => vi.restoreAllMocks());

describe('contactSupportService', () => {
  it('CSRF とセッション Cookie を使用し、title と content だけを送信して 204 を成功として扱う', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await contactSupportApiAdapter.create({ content: 'お問い合わせ内容', title: 'お問い合わせ件名' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/contact-support', {
      body: JSON.stringify({ content: 'お問い合わせ内容', title: 'お問い合わせ件名' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
  });

  it('422 のフィールドエラーを画面へ渡せる形で返す', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ errors: { content: ['内容を入力してください。'], title: ['件名を入力してください。'] } }), { status: 422 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(contactSupportApiAdapter.create({ content: '', title: '' })).rejects.toEqual(new ContactSupportError('Failed to submit contact support request', 422, {
      content: ['内容を入力してください。'],
      title: ['件名を入力してください。'],
    }));
  });

  it.each([
    [{ content: '内容', title: '   ' }, { title: 'titleRequired' }],
    [{ content: '内容', title: 'a'.repeat(51) }, { title: 'titleTooLong' }],
    [{ content: '内容', title: '件名\n続き' }, { title: 'titleNewline' }],
    [{ content: '内容', title: '件名\u2028続き' }, { title: 'titleNewline' }],
    [{ content: '内容', title: '件名\u2029続き' }, { title: 'titleNewline' }],
    [{ content: '   ', title: '件名' }, { content: 'contentRequired' }],
    [{ content: 'a'.repeat(501), title: '件名' }, { content: 'contentTooLong' }],
    [{ content: 'a'.repeat(500), title: 'a'.repeat(50) }, {}],
  ])('フォーム契約を検証する: %o', (input, expected) => {
    expect(validateContactSupport(input)).toEqual(expected);
  });

  it.each([
    [{ content: '内容', title: '😀'.repeat(50) }, {}],
    [{ content: '内容', title: '😀'.repeat(51) }, { title: 'titleTooLong' }],
    [{ content: '😀'.repeat(500), title: '件名' }, {}],
    [{ content: '😀'.repeat(501), title: '件名' }, { content: 'contentTooLong' }],
  ])('絵文字をUnicodeコードポイント数で検証する: %o', (input, expected) => {
    expect(validateContactSupport(input)).toEqual(expected);
  });
});
