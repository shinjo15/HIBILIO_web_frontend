import { describe, expect, it } from 'vitest';
import { createRoutineFeedService } from './routineFeedService';

const routines = [
  {
    author: { handle: 'new-user', name: '新しい人' },
    createdAt: '2026-09-04T00:00:00.000Z',
    customizations: 1,
    description: '新着ルーティン',
    durationMinutes: 20,
    executions: 2,
    id: 'new',
    liked: false,
    likes: 3,
    steps: [{ action: '始める', time: '07:00' }],
    tags: ['新着'],
    title: '新しいルーティン',
  },
  {
    author: { handle: 'popular-user', name: '人気の人' },
    createdAt: '2026-09-01T00:00:00.000Z',
    customizations: 2,
    description: '人気ルーティン',
    durationMinutes: 30,
    executions: 20,
    id: 'popular',
    liked: false,
    likes: 100,
    steps: [{ action: '続ける', time: '08:00' }],
    tags: ['人気'],
    title: '人気のルーティン',
  },
];

describe('routineFeedService', () => {
  it('タブに応じて service 内で並び替える', async () => {
    const service = createRoutineFeedService({ list: async () => routines });

    await expect(service.list('recommended')).resolves.toEqual(routines);
    await expect(service.list('popular')).resolves.toEqual([routines[1], routines[0]]);
    await expect(service.list('recent')).resolves.toEqual([routines[0], routines[1]]);
  });

  it('adapter のレスポンスを Zod で検証する', async () => {
    const service = createRoutineFeedService({ list: async () => [{ invalid: true }] });

    await expect(service.list()).rejects.toThrow();
  });

  it('IDから詳細用のルーティンを取得できる', async () => {
    const service = createRoutineFeedService({ list: async () => routines });

    await expect(service.getById('popular')).resolves.toEqual(routines[1]);
    await expect(service.getById('missing')).resolves.toBeUndefined();
  });
});
