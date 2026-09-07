import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRoutineDetailAdapter, createRoutineDetailService } from './routineDetailService';

afterEach(() => vi.unstubAllGlobals());

const dto = {
  author: { handle: 'routine-owner', name: 'ルーティン作者' },
  customizations: 2,
  customizationsList: [],
  description: '説明',
  durationMinutes: 65,
  executions: 12,
  executionPosts: [
    {
      achieved: 1,
      avatar: 'R',
      cheers: 3,
      date: '今日',
      id: 'execution-1',
      minutes: 60,
      routineId: 'routine-1',
      total: 2,
      userHandle: 'runner',
      userName: '実行した人',
    },
  ],
  id: 'routine-1',
  liked: false,
  likes: 4,
  steps: [{ action: '開始', time: '07:00' }],
  tags: ['習慣'],
  title: 'テストルーティン',
};

describe('routineDetailService', () => {
  it('詳細取得APIのレスポンスを詳細画面用に変換する', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
      account_identifier: '10000000-0000-4000-8000-000000000002',
      account_name: '春野あかり',
      customization_count: 1,
      execution_count: 3,
      like_count: 2,
      routine_actions: [{
        action_memo: null,
        action_minutes: 10,
        action_name: '水を飲む',
        routine_action_identifier: '40000000-0000-4000-8000-000000000001',
      }],
      routine_execution_minutes: 10,
      routine_memo: '説明',
      routine_name: '朝のルーティン',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          account_identifier: '10000000-0000-4000-8000-000000000004',
          account_name: '美香',
          customization_count: 0,
          execution_count: 0,
          like_count: 0,
          routine_execution_minutes: 20,
          routine_identifier: '30000000-0000-4000-8000-000000000004',
          routine_memo: '朝食前の短縮版です。',
          routine_name: '朝の集中ルーティンをカスタマイズ',
        }],
        total: 1,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          account_identifier: '10000000-0000-4000-8000-000000000001',
          account_name: '実行した人',
          executed_action_count: 1,
          posted_at: '2026-09-07T14:26:31+00:00',
          routine_execution_identifier: '70000000-0000-4000-8000-000000000001',
          routine_execution_memo: '実行メモです。',
          support_count: 2,
        }],
        total: 1,
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createRoutineDetailService(apiRoutineDetailAdapter).get('30000000-0000-4000-8000-000000000001')).resolves.toMatchObject({
      customizationsList: [{ authorName: '美香', id: '30000000-0000-4000-8000-000000000004' }],
      duration: '10分',
      executionPosts: [{ achieved: 1, cheers: 2, comment: '実行メモです。', id: '70000000-0000-4000-8000-000000000001', total: 1, userName: '実行した人' }],
      executions: 3,
      likes: 2,
      steps: [{ action: '水を飲む', duration: '10分' }],
      title: '朝のルーティン',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/routines/30000000-0000-4000-8000-000000000001');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/routines/30000000-0000-4000-8000-000000000001/customized?page=1&number_of_items_per_page=20');
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/routines/30000000-0000-4000-8000-000000000001/execution-posts?page=1&number_of_items_per_page=20');
  });

  it('routine ID を adapter に渡し、DTO を画面用 ViewModel に変換する', async () => {
    const get = vi.fn().mockResolvedValue(dto);
    const service = createRoutineDetailService({ get });

    await expect(service.get('routine-1')).resolves.toMatchObject({
      duration: '1時間5分',
      executionPosts: [{ id: 'execution-1', minutes: 60 }],
      title: 'テストルーティン',
    });
    expect(get).toHaveBeenCalledWith('routine-1');
  });

  it('不正な API DTO を受け取った場合は表示せずに失敗する', async () => {
    const service = createRoutineDetailService({ get: async () => ({ id: 'invalid' }) });

    await expect(service.get('routine-1')).rejects.toThrow();
  });

  it('detail が存在しない場合は null を返す', async () => {
    const service = createRoutineDetailService({ get: async () => null });

    await expect(service.get('missing')).resolves.toBeNull();
  });
});
