import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, apiUrl } from './apiFetch';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('apiUrl', () => {
  it.each(['https://api.hibilio.com/', 'http://localhost:8001/'])('origin末尾のslashを正規化する: %s', (origin) => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    expect(apiUrl('/api/tags')).toBe(`${origin.slice(0, -1)}/api/tags`);
  });

  it.each([
    '/api', '//api.hibilio.com', 'not-a-url', 'javascript:alert(1)', 'ftp://api.hibilio.com',
    'https://user:password@api.hibilio.com', 'https://api.hibilio.com/api',
    'https://api.hibilio.com?query=1', 'https://api.hibilio.com#fragment',
    'https://api.hibilio.com?', 'https://api.hibilio.com#', ' https://api.hibilio.com',
    'https://api.hibilio.com/../', 'https:\\api.hibilio.com',
  ])('不正なorigin設定では通信前に失敗し、設定値をエラーへ出さない: %s', (origin) => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(() => apiFetch('/api/csrf-token', { credentials: 'include' })).toThrow('Invalid VITE_API_ORIGIN: expected an HTTP(S) origin without credentials, path, query or fragment');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, ''])('originが%sなら相対APIパスを変更しない', (origin) => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    expect(apiUrl('/api/routines/search?keyword=a%20b&page=2')).toBe('/api/routines/search?keyword=a%20b&page=2');
    expect(apiUrl('/auth/social/google')).toBe('/auth/social/google');
  });

  it('APIパス・query・social loginへ同じoriginを適用する', () => {
    vi.stubEnv('VITE_API_ORIGIN', 'https://api.hibilio.com');
    expect(apiUrl('/api/routines/search?keyword=a%20b&page=2')).toBe('https://api.hibilio.com/api/routines/search?keyword=a%20b&page=2');
    expect(apiUrl('/auth/social/google')).toBe('https://api.hibilio.com/auth/social/google');
  });

  it.each(['https://images.example/icon.png', '//cdn.example/file', 'mailto:support@example.com', '/images/logo.svg', '/apiary'])('外部URLとAPI以外のパスは変更しない: %s', (path) => {
    vi.stubEnv('VITE_API_ORIGIN', 'https://api.hibilio.com');
    expect(apiUrl(path)).toBe(path);
  });
});

describe('apiFetch', () => {
  it('fetchのoptions・response・HTTPエラーをそのまま保持する', async () => {
    vi.stubEnv('VITE_API_ORIGIN', 'https://api.hibilio.com');
    const response = new Response(null, { status: 419 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    const init: RequestInit = {
      body: new FormData(), credentials: 'include', headers: { 'X-CSRF-TOKEN': 'session-token' },
      method: 'POST', signal: new AbortController().signal,
    };
    expect(await apiFetch('/api/accounts', init)).toBe(response);
    expect(fetchMock).toHaveBeenCalledWith('https://api.hibilio.com/api/accounts', init);
  });

  it('options省略時もAPI Cookieを含め、network errorを保持する', async () => {
    vi.stubEnv('VITE_API_ORIGIN', '');
    const error = new TypeError('Network unavailable');
    const fetchMock = vi.fn().mockRejectedValue(error);
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiFetch('/api/tags')).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledWith('/api/tags', { credentials: 'include' });
  });

  it('API GETはorigin切替後もCookieを含め、明示的なcredentialsは上書きしない', async () => {
    vi.stubEnv('VITE_API_ORIGIN', 'https://api.hibilio.com');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch('/api/routines/routine-1', { method: 'GET' });
    await apiFetch('/api/tags', { credentials: 'omit' });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.hibilio.com/api/routines/routine-1', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.hibilio.com/api/tags', { credentials: 'omit' });
  });
});
