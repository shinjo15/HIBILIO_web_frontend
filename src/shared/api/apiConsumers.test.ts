import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountBlockService } from '../../features/account/services/accountBlockService';
import { accountFollowService } from '../../features/account/services/accountFollowService';
import { accountService } from '../../features/account/services/accountService';
import { followRequestService } from '../../features/account/services/followRequestService';
import { profileEditService } from '../../features/account/services/profileEditService';
import { publicAccountService } from '../../features/account/services/publicAccountService';
import { getPickupTags } from '../../features/auth/register/services/pickupTagService';
import { logout, resetAuthenticationForTesting, restoreAuthentication } from '../../features/auth/services/authSession';
import { contactSupportService } from '../../features/contactSupport/services/contactSupportService';
import { reportService } from '../../features/report/services/reportService';
import { apiRoutineDetailAdapter } from '../../features/routineDetail/services/routineDetailService';
import { routineLikeService } from '../../features/routineFeed/services/routineLikeService';
import { routineFeedService } from '../../features/routineFeed/services/routineFeedService';
import { searchService } from '../../features/search/services/searchService';
import { accountVisibilityService } from '../../features/settings/services/accountVisibilityService';

const origin = 'https://api.hibilio.com';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetAuthenticationForTesting();
});

describe('production API consumers', () => {
  const reads: Array<[string, () => Promise<unknown>, string[]]> = [
    ['account', () => accountService.getProfile(), ['/api/my/account']],
    ['profile edit', () => profileEditService.load(), ['/api/my/account']],
    ['public account', () => publicAccountService.get('account-1'), ['/api/accounts/account-1']],
    ['pickup tags', getPickupTags, ['/api/tags/pickup']],
    ['session restoration', restoreAuthentication, ['/api/my/account']],
    ['feed', () => routineFeedService.list('popular'), ['/api/posts/popular?number_of_items_per_page=40&page=1']],
    ['search', () => searchService.listAllTags(), ['/api/tags']],
    ['routine detail', () => apiRoutineDetailAdapter.get('routine-1'), [
      '/api/routines/routine-1', '/api/routines/routine-1/customized?page=1&number_of_items_per_page=40',
      '/api/routines/routine-1/execution-posts?page=1&number_of_items_per_page=40',
    ]],
  ];

  it.each(reads)('%sのGETとエラー経路もAPI originを使用する', async (_name, call, paths) => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 503 })));
    vi.stubGlobal('fetch', fetchMock);
    await call().catch(() => undefined);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(paths.map((path) => `${origin}${path}`));
    paths.forEach((path) => expect(fetchMock).toHaveBeenCalledWith(`${origin}${path}`, expect.objectContaining({ credentials: 'include' })));
  });

  const mutations: Array<[string, () => Promise<unknown>, string]> = [
    ['block', () => accountBlockService.create('account-1'), '/api/blocks'],
    ['follow', () => accountFollowService.create('account-1'), '/api/follows'],
    ['follow request', () => followRequestService.approve('account-1'), '/api/follow-requests/account-1/approve'],
    ['like', () => routineLikeService.create('post-1'), '/api/likes'],
    ['contact', () => contactSupportService.create({ content: '内容', title: '件名' }), '/api/contact-support'],
    ['report', () => reportService.create({ category: 'spam', targetAccountIdentifier: 'account-1', text: 'report' }), '/api/reports'],
    ['logout', logout, '/api/logout'],
  ];

  it.each(mutations)('%sはorigin切替後もCSRF JSONとcredentialsを保持する', async (_name, call, path) => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'api-only-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(call()).rejects.toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${origin}/api/csrf-token`, { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${origin}${path}`, expect.objectContaining({
      credentials: 'include', headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'api-only-token' }), method: 'POST',
    }));
  });

  it('公開範囲変更はorigin切替後もCSRF JSON、Cookie、PATCHを保持する', async () => {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'api-only-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await accountVisibilityService.update('private');

    expect(fetchMock).toHaveBeenNthCalledWith(1, `${origin}/api/csrf-token`, { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${origin}/api/my/account/visibility`, {
      body: JSON.stringify({ visibility: 'private' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'api-only-token' },
      method: 'PATCH',
    });
  });
});
