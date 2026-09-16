import { describe, expect, it } from 'vitest';
import { shouldInsertFeedAdvertisement } from './feedAdvertisementPlacement';

describe('shouldInsertFeedAdvertisement', () => {
  it('広告が有効なら20件ごとの投稿直後に広告を挿入する', () => {
    expect(shouldInsertFeedAdvertisement(19, true)).toBe(true);
    expect(shouldInsertFeedAdvertisement(39, true)).toBe(true);
    expect(shouldInsertFeedAdvertisement(59, true)).toBe(true);
    expect(shouldInsertFeedAdvertisement(18, true)).toBe(false);
  });

  it('広告が無効なら挿入しない', () => {
    expect(shouldInsertFeedAdvertisement(19, false)).toBe(false);
  });
});
