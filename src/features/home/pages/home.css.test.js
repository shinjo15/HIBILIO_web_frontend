import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/home/pages/home.css'), 'utf8');

describe('home page styles', () => {
  it('PC Homeのコンテンツ幅に合わせ、日付不明履歴をカレンダーの下に表示する', () => {
    expect(styles).toContain('max-width: 960px;');
    expect(styles).toContain('.home-page__history-desktop {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  min-width: 0;');
    expect(styles).not.toContain('.home-page__history-desktop {\n  display: grid;');
    expect(styles).toContain('box-sizing: border-box;');
    expect(styles).toContain('width: 100%;');
    expect(styles).toContain('.home-page__calendar {\n  background-color: var(--hibilio-color-card);\n  border: 1px solid var(--hibilio-color-primary);\n}');
    expect(styles).toContain('.home-page__undated {\n  border: 1px solid var(--hibilio-color-border);\n}');
  });

  it('狭い幅でも未来日の日付を薄いグレーで表示し、日付セルと長い履歴タイトルを幅内に収める', () => {
    expect(styles).toContain('.home-page__calendar-day {\n  border: 1px solid var(--hibilio-color-border);\n  min-height: 72px;\n  min-width: 0;');
    expect(styles).toContain('.home-page__calendar-day--future > span {\n  color: var(--hibilio-color-muted-text);\n}');
    expect(styles).toContain('max-width: 100%;');
    expect(styles).toContain('text-overflow: ellipsis;');
  });

  it('いいねカードを横スワイプ可能なスナップ付きの一列に保つ', () => {
    expect(styles).toContain('.home-page__likes-scroll {\n  display: flex;\n  gap: 12px;\n  overflow-x: auto;');
    expect(styles).toContain('overscroll-behavior-inline: contain;');
    expect(styles).toContain('scroll-snap-type: inline mandatory;');
    expect(styles).toContain('touch-action: pan-x;');
    expect(styles).toContain('.home-page__likes-scroll .routine-card {\n  flex: 0 0 min(100%, 400px);');
    expect(styles).toContain('scroll-snap-align: start;');
  });

  it('モバイルでも横スワイプ用カード幅を画面内に保つ', () => {
    expect(styles).toContain('@media (max-width: 599px) {');
    expect(styles).toContain('.home-page__likes-scroll .routine-card {\n    flex-basis: min(100%, calc(100vw - 48px));');
  });
});