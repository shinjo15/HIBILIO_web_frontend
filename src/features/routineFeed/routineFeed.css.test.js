import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/routineFeed/routineFeed.css'), 'utf8');
const typography = readFileSync(resolve(globalThis.process.cwd(), 'src/features/routineFeed/routineFeedTypography.css'), 'utf8');

describe('routine feed card customization origin styles', () => {
  it('共通スコープで親から子へ向かうL字装飾と長文折返しを定義する', () => {
    expect(styles).toContain('.routine-feed-card-scope .routine-card__origin-connector');
    expect(styles).toMatch(/\.routine-card__title-row[\s\S]*align-items: center/);
    expect(styles).toMatch(/\.routine-card__origin-connector[\s\S]*border-top:/);
    expect(styles).toMatch(/\.routine-card__title-row--with-origin::before[\s\S]*border-left:/);
    expect(styles).toMatch(/\.routine-card__origin-connector[\s\S]*flex: 0 0 14px[\s\S]*margin-left: 10px/);
    expect(styles).toMatch(/\.routine-card__customization-origin \{[\s\S]*align-items: center/);
    expect(styles).toMatch(/\.routine-card__customization-origin-avatar \{[\s\S]*height: 20px[\s\S]*width: 20px/);
    expect(styles).toMatch(/\.routine-card__customization-origin::after[\s\S]*border-left:[\s\S]*top: calc\(50% \+ 14px\)[\s\S]*bottom: -12px/);
    expect(styles).toMatch(/\.routine-card__customization-origin-text[\s\S]*overflow-wrap: anywhere/);
  });

  it('タイトルを既存16pxより大きくし、フィードと検索の共通スコープで同一指定にする', () => {
    expect(typography).toMatch(/\.routine-feed-page \.routine-card__title,[\s\S]*\.routine-feed-card-scope \.routine-card__title[\s\S]*font-size: 18px/);
  });

  it('親なしを含む全タイトルは、L字線の終点に揃う同一のdesktop/mobile左余白を持つ', () => {
    expect(styles).toMatch(/\.routine-feed-page \.routine-card__title,[\s\S]*\.routine-feed-card-scope \.routine-card__title \{[\s\S]*margin-left: 28px/);
    expect(styles).toMatch(/@media \(max-width: 479px\)[\s\S]*\.routine-feed-page \.routine-card__title,[\s\S]*\.routine-feed-card-scope \.routine-card__title \{[\s\S]*margin-left: 24px/);
    expect(styles).toMatch(/\.routine-card__title-row--with-origin .routine-card__title[\s\S]*margin-left: 4px/);
    expect(styles).toMatch(/@media \(max-width: 479px\)[\s\S]*flex-basis: 11px[\s\S]*\.routine-card__title-row--with-origin .routine-card__title[\s\S]*margin-left: 4px/);
    expect(styles).not.toContain('routine-card__title--customized');
  });

  it('タイトル本文boxの中央に線を合わせるため、下余白をタイトル行へ移す', () => {
    expect(typography).toMatch(/\.routine-feed-page \.routine-card__title,[\s\S]*margin-bottom: 0/);
    expect(styles).toMatch(/\.routine-card__title-row[\s\S]*margin-bottom: 8px/);
  });
});