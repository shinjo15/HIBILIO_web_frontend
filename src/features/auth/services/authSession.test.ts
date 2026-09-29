import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthenticated,
  getAuthenticationStatus,
  logout,
  markAuthenticated,
  resetAuthenticationForTesting,
  restoreAuthentication,
} from './authSession';

afterEach(() => {
  resetAuthenticationForTesting();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('authSession', () => {
  it('セッション確認が401なら CSRF と Cookie 付きで永続ログインを復元し、再確認が成功したときだけ認証済みにする', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await restoreAuthentication();

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/my/account', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/persistent-login/restore', {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/my/account', { credentials: 'include', method: 'GET' });
    expect(getAuthenticationStatus()).toBe('authenticated');
  });

  it('ログアウト API が成功したときだけ未認証にし、CSRF と Cookie を送信する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/logout', {
      credentials: 'include',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'POST',
    });
    expect(getAuthenticationStatus()).toBe('unauthenticated');
  });

  it('旧storage認証フラグに左右されず、認証情報をstorageへ書き込まない', async () => {
    window.localStorage.setItem('hibilio.authenticated', 'true');
    window.sessionStorage.setItem('hibilio.authenticated', 'true');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await restoreAuthentication();
    markAuthenticated();
    clearAuthenticated();

    expect(getAuthenticationStatus()).toBe('unauthenticated');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('ログアウト失敗時は認証済み状態を維持する', async () => {
    markAuthenticated();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(logout()).rejects.toThrow('Failed to logout');

    expect(getAuthenticationStatus()).toBe('authenticated');
  });

  it('ログアウト成功後は遅延した永続ログイン復元が認証済み状態へ戻さない', async () => {
    let resolveRestore: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'restore-csrf-token' }), { status: 200 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRestore = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'logout-csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const restoration = restoreAuthentication();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await logout();
    resolveRestore(new Response(null, { status: 204 }));
    await restoration;

    expect(getAuthenticationStatus()).toBe('unauthenticated');
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('既存画面の401で認証状態を破棄した後は、先行した復元確認の成功応答で認証済みに戻さない', async () => {
    let resolveSessionCheck: (response: Response) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveSessionCheck = resolve; })));

    const restoration = restoreAuthentication();
    clearAuthenticated();
    resolveSessionCheck(new Response(null, { status: 200 }));
    await restoration;

    expect(getAuthenticationStatus()).toBe('unauthenticated');
  });

  it('ログイン成功後は、先行した復元確認の401応答で認証状態を上書きしない', async () => {
    let resolveSessionCheck: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSessionCheck = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const restoration = restoreAuthentication();
    markAuthenticated();
    resolveSessionCheck(new Response(null, { status: 401 }));
    await restoration;

    expect(getAuthenticationStatus()).toBe('authenticated');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ログアウト成功後に初回確認が返っても、永続ログイン復元POSTを送らない', async () => {
    let resolveSessionCheck: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSessionCheck = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'logout-csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const restoration = restoreAuthentication();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await logout();
    resolveSessionCheck(new Response(null, { status: 401 }));
    await restoration;

    expect(getAuthenticationStatus()).toBe('unauthenticated');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('重複した復元要求は一つの進行中リクエストを共有する', async () => {
    let resolveSessionCheck: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveSessionCheck = resolve; }));
    vi.stubGlobal('fetch', fetchMock);

    const firstRestoration = restoreAuthentication();
    const secondRestoration = restoreAuthentication();
    resolveSessionCheck(new Response(null, { status: 200 }));
    await Promise.all([firstRestoration, secondRestoration]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthenticationStatus()).toBe('authenticated');
  });
});
