import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRoutineCreateService,
  RoutineCreateApiError,
  RoutineCreateUnauthorizedError,
  routineCreateApiAdapter,
} from './routineCreateService';

const validForm = {
  actions: [{ actionMemo: '', actionMinutes: '', actionName: '始める' }],
  routineExecutionMinutes: '',
  routineMemo: '',
  routineName: 'テストルーティン',
};

afterEach(() => vi.restoreAllMocks());

describe('routineCreateService', () => {
  it('全体とアクションの動画URLを変換済み payload として adapter に渡す', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = createRoutineCreateService({ create });

    await service.create({
      ...validForm,
      actions: [{ ...validForm.actions[0], videoUrl: 'https://example.com/action-video' }],
      videoUrl: 'https://example.com/routine-video',
    });

    expect(create).toHaveBeenCalledWith({
      routine_actions: [{ routine_action_name: '始める', video_url: 'https://example.com/action-video' }],
      routine_name: 'テストルーティン',
      video_url: 'https://example.com/routine-video',
    });
  });

  it('空の動画URLを省略し、不正なURLを adapter に送信しない', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = createRoutineCreateService({ create });

    await service.create({ ...validForm, actions: [{ ...validForm.actions[0], videoUrl: '' }], videoUrl: '' });
    expect(create).toHaveBeenCalledWith({
      routine_actions: [{ routine_action_name: '始める' }],
      routine_name: 'テストルーティン',
    });

    await expect(service.create({ ...validForm, videoUrl: 'javascript:alert(1)' })).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('CSRF取得後、全体とアクションの動画URLをJSON bodyと必要なヘッダーでPOSTする', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ csrf_token: 'csrf-token' }),
        ok: true,
      })
      .mockResolvedValueOnce({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);

    await routineCreateApiAdapter.create({
      routine_actions: [{ routine_action_name: '始める', video_url: 'https://example.com/action-video' }],
      routine_name: 'テストルーティン',
      video_url: 'https://example.com/routine-video',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', {
      credentials: 'include',
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/routines', {
      body: JSON.stringify({
        routine_actions: [{ routine_action_name: '始める', video_url: 'https://example.com/action-video' }],
        routine_name: 'テストルーティン',
        video_url: 'https://example.com/routine-video',
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': 'csrf-token',
      },
      method: 'POST',
    });
  });

  it('不正なフォームを adapter に送信しない', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = createRoutineCreateService({ create });

    await expect(service.create({
      ...validForm,
      actions: [],
    })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it('お気に入りタグを認証付き API から DTO 変換して取得する', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ favorite_tags: [{ tag_identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tag_name: '朝活' }] }),
      ok: true,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createRoutineCreateService(routineCreateApiAdapter).loadFavoriteTags!()).resolves.toEqual([
      { identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '朝活' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/my/account', { credentials: 'include', method: 'GET' });
  });

  it('入力をエンコードした tag_name query でタグを検索する', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ tags: [{ tag_identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', tag_name: '朝 & 運動' }] }),
      ok: true,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createRoutineCreateService(routineCreateApiAdapter).searchTagCandidates!('朝 & 運動')).resolves.toEqual([
      { identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '朝 & 運動' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/tags?tag_name=%E6%9C%9D+%26+%E9%81%8B%E5%8B%95', { credentials: 'include', method: 'GET' });
  });

  it('お気に入り取得の 401 を認証失効として区別する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(createRoutineCreateService(routineCreateApiAdapter).loadFavoriteTags!()).rejects.toBeInstanceOf(RoutineCreateUnauthorizedError);
  });

  it('タグ検索の失敗を再試行可能な API error として返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(createRoutineCreateService(routineCreateApiAdapter).searchTagCandidates!('朝')).rejects.toBeInstanceOf(RoutineCreateApiError);
  });

  it('作成 API の 401 を認証失効として区別する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ csrf_token: 'csrf-token' }), ok: true })
      .mockResolvedValueOnce({ ok: false, status: 401 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(routineCreateApiAdapter.create({
      routine_actions: [{ routine_action_name: '始める' }],
      routine_name: 'テストルーティン',
    })).rejects.toBeInstanceOf(RoutineCreateUnauthorizedError);
  });
});
