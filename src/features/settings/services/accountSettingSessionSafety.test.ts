import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthenticated, getAuthenticationGeneration, markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import { resetUiModeServiceForTesting, uiModeService } from '../../../app/uiModeService';
import { enqueueAccountMutation, resetAccountMutationQueueForTesting } from '../../../shared/api/accountMutationQueue';
import { accountVisibilityService, resetAccountVisibilityServiceForTesting } from './accountVisibilityService';
import { likeNotificationService, resetLikeNotificationServiceForTesting } from './likeNotificationService';
import { resetSupportNotificationServiceForTesting, supportNotificationService } from './supportNotificationService';

afterEach(() => {
  resetAccountMutationQueueForTesting();
  resetAccountVisibilityServiceForTesting();
  resetLikeNotificationServiceForTesting();
  resetSupportNotificationServiceForTesting();
  resetUiModeServiceForTesting();
  resetAuthenticationForTesting();
  vi.unstubAllGlobals();
});

describe('account setting mutations after an authentication switch', () => {
  it('queue待機中に切り替わった旧4設定操作は新CookieでCSRF取得もPATCHもせず、後続の新操作を実行できる', async () => {
    markAuthenticated();
    const oldGeneration = getAuthenticationGeneration();
    let releaseQueue: () => void = () => undefined;
    let markQueueStarted: () => void = () => undefined;
    const queueStarted = new Promise<void>((resolve) => { markQueueStarted = resolve; });
    const blocker = enqueueAccountMutation(() => new Promise<void>((resolve) => {
      markQueueStarted();
      releaseQueue = resolve;
    }));
    await queueStarted;
    const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>((path) => {
      if (path === '/api/csrf-token') return Promise.resolve(new Response(JSON.stringify({ csrf_token: 'new-session-token' }), { status: 200 }));
      if (path === '/api/my/account/visibility' || path === '/api/my/account/like-notifications' || path === '/api/my/account/support-notifications' || path === '/api/my/account/ui-mode') return Promise.resolve(new Response(null, { status: 204 }));
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const oldOperations = [
      accountVisibilityService.update('private', oldGeneration),
      likeNotificationService.update(true, oldGeneration),
      supportNotificationService.update(true, oldGeneration),
      uiModeService.update('dark', oldGeneration),
    ];
    const oldResults = Promise.allSettled(oldOperations);

    clearAuthenticated();
    markAuthenticated();
    releaseQueue();

    const settled = await oldResults;
    await blocker;
    expect(settled).toHaveLength(4);
    expect(settled.every((result) => result.status === 'rejected' && String(result.reason).includes('session changed'))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    await accountVisibilityService.update('private');
    await likeNotificationService.update(true);
    await supportNotificationService.update(true);
    await uiModeService.update('dark');

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/csrf-token')).toHaveLength(4);
    expect(fetchMock.mock.calls.filter(([path]) => path !== '/api/csrf-token').map(([path]) => path)).toEqual([
      '/api/my/account/visibility',
      '/api/my/account/like-notifications',
      '/api/my/account/support-notifications',
      '/api/my/account/ui-mode',
    ]);
    fetchMock.mock.calls.forEach(([path, init]) => {
      expect(init).toMatchObject({ credentials: 'include' });
      if (path !== '/api/csrf-token') expect(init).toMatchObject({ headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'new-session-token' }), method: 'PATCH' });
    });
  });

  it.each([
    ['公開範囲', (generation: number) => accountVisibilityService.update('private', generation)],
    ['いいね通知', (generation: number) => likeNotificationService.update(true, generation)],
    ['応援通知', (generation: number) => supportNotificationService.update(true, generation)],
    ['テーマ', (generation: number) => uiModeService.update('dark', generation)],
  ])('%s はCSRF取得中の認証切替後にPATCHしない', async (_name, update) => {
    markAuthenticated();
    const generation = getAuthenticationGeneration();
    let resolveCsrf: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn<(path: string) => Promise<Response>>((path) => {
      if (path === '/api/csrf-token') return new Promise<Response>((resolve) => { resolveCsrf = resolve; });
      throw new Error(`PATCH must not be called: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = update(generation);
    const rejected = expect(pending).rejects.toThrow('session changed');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/csrf-token', { credentials: 'include', method: 'GET' }));
    clearAuthenticated();
    markAuthenticated();
    resolveCsrf(new Response(JSON.stringify({ csrf_token: 'old-session-token' }), { status: 200 }));

    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
