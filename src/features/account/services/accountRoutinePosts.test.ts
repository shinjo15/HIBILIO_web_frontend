import { describe, expect, it } from 'vitest';
import { parseAccountPosts, parseLikedRoutines } from './accountRoutinePosts';

const post = {
  account_identifier: '11111111-1111-4111-8111-111111111111',
  account_name: '投稿者',
  customization_count: 1,
  execution_count: 3,
  liked: true,
  post_identifier: 'post-1',
  post_like_count: 2,
  post_support_count: 4,
  posted_at: '2026-09-03T12:00:00+00:00',
  routine_actions: [],
  routine_execution_minutes: 30,
  routine_identifier: 'routine-1',
  routine_name: '朝の集中ルーティン',
  tags: [],
};

describe('account routine post mappers', () => {
  it('投稿一覧の liked を現在の閲覧者の状態として保持する', () => {
    expect(parseAccountPosts({ items: [post], total: 1 })).toMatchObject([{ id: 'post-1', liked: true }]);
  });

  it('いいね一覧でも liked_at ではなく API の liked を現在の閲覧者の状態として保持する', () => {
    expect(parseLikedRoutines({
      items: [{ ...post, liked: false, liked_at: '2026-09-04T12:00:00+00:00' }],
      total: 1,
    })).toMatchObject([{ id: 'post-1', liked: false }]);
  });
});
