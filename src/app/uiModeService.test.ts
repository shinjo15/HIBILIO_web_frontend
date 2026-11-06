import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUiModeService, resetUiModeServiceForTesting, UiModeUnauthorizedError } from './uiModeService';

afterEach(() => {
  resetUiModeServiceForTesting();
  vi.unstubAllGlobals();
});

describe('createUiModeService', () => {
  it('GET /api/my/account から保存済みui_modeを取得する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ui_mode: 'system' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createUiModeService().load()).resolves.toBe('system');
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account', { credentials: 'include', method: 'GET' });
  });

  it('CSRFとCookie付きでPATCH /api/my/account/ui-modeへ3択のui_modeを保存する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await createUiModeService().update('dark');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/my/account/ui-mode', {
      body: JSON.stringify({ ui_mode: 'dark' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      method: 'PATCH',
    });
  });

  it('同時の更新要求は進行中の1リクエストを共有する', async () => {
    let resolvePatch: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: 'csrf-token' }), { status: 200 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePatch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);

    const service = createUiModeService();
    const first = service.update('light');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const second = service.update('dark');
    resolvePatch(new Response(null, { status: 204 }));
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('取得と更新の401を認証切れとして扱う', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(createUiModeService().load()).rejects.toBeInstanceOf(UiModeUnauthorizedError);
    await expect(createUiModeService().update('system')).rejects.toBeInstanceOf(UiModeUnauthorizedError);
  });
});
