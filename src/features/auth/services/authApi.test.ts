import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('authApi', () => {
  it('API origin指定時もCookieを含むCSRF JSON取得後に同じoriginへPOSTする（document.cookie不要）', async () => {
    vi.stubEnv('VITE_API_ORIGIN', 'https://api.hibilio.com');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'api-session-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { requestLoginPasscode } = await import('./authApi');

    await requestLoginPasscode('member@example.com');

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.hibilio.com/api/csrf-token', {
      credentials: 'include', method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.hibilio.com/api/login-passcodes', {
      body: JSON.stringify({ email_address: 'member@example.com' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'api-session-token' },
      method: 'POST',
    });
  });

  it('CSRFトークンを取得してからPOST APIへヘッダー付きで送信する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { requestRegistrationPasscode } = await import('./authApi');

    await requestRegistrationPasscode('new@example.com');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', {
      credentials: 'include',
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/registration-passcodes', {
      body: JSON.stringify({ email_address: 'new@example.com' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
  });
});
