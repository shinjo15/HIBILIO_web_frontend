import { describe, expect, it } from 'vitest';
// @ts-expect-error Vitest executes this test in Node, while app code intentionally excludes Node types.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/features/home/pages/home.css', 'utf8');
const tokens = readFileSync('src/styles/tokens.css', 'utf8');

describe('home.css calendar future days', () => {
  it('ライト・ダークテーマ共通のmuted tokenで未来日のセル背景と日付文字を非活性表示にする', () => {
    expect(tokens).toMatch(/:root\s*\{[^}]*--hibilio-color-muted:\s*[^;]+;[^}]*--hibilio-color-muted-text:\s*[^;]+;/);
    expect(tokens).toMatch(/\.hibilio-theme-dark\s*\{[^}]*--hibilio-color-muted:\s*[^;]+;[^}]*--hibilio-color-muted-text:\s*[^;]+;/);
    expect(css).toMatch(/\.home-page__calendar-day--future\s*\{[^}]*background-color:\s*var\(--hibilio-color-muted\);/);
    expect(css).toMatch(/\.home-page__calendar-day--future > span\s*\{[^}]*color:\s*var\(--hibilio-color-muted-text\);/);
  });

  it('今日の主色枠と実行履歴ボタンの可読色を維持する', () => {
    expect(css).toMatch(/\.home-page__calendar-day--today\s*\{[^}]*border:\s*2px solid var\(--hibilio-color-primary\);/);
    expect(css).toMatch(/\.home-page__calendar-history\s*\{[^}]*background:\s*var\(--hibilio-color-primary\);[^}]*color:\s*var\(--hibilio-color-on-primary\);/);
  });

  it('本人プロフィール名をPCとモバイルで幅を超えずに省略表示できるようにする', () => {
    expect(css).toMatch(/\.home-page__profile\s*\{[^}]*min-width:\s*0;/);
    expect(css).toMatch(/\.home-page__profile-name\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/);
    expect(css).toMatch(/\.home-page__profile-avatar\s*\{[^}]*flex:\s*0 0 auto;/);
  });

  it('既存デザインのまま、自己紹介は改行を保持し長文・連続文字列もプロフィール幅を超えない', () => {
    expect(css).toMatch(/\.home-page__profile\s*\{[^}]*align-items:\s*flex-end;[^}]*border-bottom:\s*1px solid var\(--hibilio-color-border\);[^}]*gap:\s*12px;[^}]*padding:\s*0 2px 16px;/);
    expect(css).toMatch(/\.home-page__profile-avatar\s*\{[^}]*border:\s*3px solid var\(--hibilio-color-card\);[^}]*box-shadow:\s*0 0 0 1px var\(--hibilio-color-border\);[^}]*height:\s*52px;[^}]*width:\s*52px;/);
    expect(css).toMatch(/\.home-page__profile-name\s*\{[^}]*font-size:\s*18px;/);
    expect(css).toMatch(/\.home-page__profile-copy\s*\{[^}]*display:\s*grid;[^}]*gap:\s*2px;[^}]*min-width:\s*0;[^}]*padding-bottom:\s*2px;/);
    expect(css).toMatch(/\.home-page__profile-bio\s*\{[^}]*color:\s*var\(--hibilio-color-muted-text\);[^}]*font-size:\s*12px;[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*pre-wrap;/);
  });

  it('levelを名前の直後に同じ色・区切り・枠なしで置き、長い名前でもlevelを見切れさせない', () => {
    expect(css).toMatch(/\.home-page__profile-name-row\s*\{[^}]*align-items:\s*baseline;[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*min-width:\s*0;/);
    expect(css).toMatch(/\.home-page__profile-name-row \.home-page__profile-name\s*\{[^}]*flex:\s*0 1 auto;[^}]*max-width:\s*100%;[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/);
  });

  it('プロフィールの枠と画像未設定時のAvatar背景をライト・ダーク共通tokenで描画する', () => {
    expect(tokens).toMatch(/:root\s*\{[^}]*--hibilio-color-card:\s*[^;]+;/);
    expect(tokens).toMatch(/:root\s*\{[^}]*--hibilio-color-border:\s*[^;]+;/);
    expect(tokens).toMatch(/:root\s*\{[^}]*--hibilio-color-primary:\s*[^;]+;/);
    expect(tokens).toMatch(/\.hibilio-theme-dark\s*\{[^}]*--hibilio-color-card:\s*[^;]+;/);
    expect(tokens).toMatch(/\.hibilio-theme-dark\s*\{[^}]*--hibilio-color-border:\s*[^;]+;/);
    expect(tokens).toMatch(/\.hibilio-theme-dark\s*\{[^}]*--hibilio-color-primary:\s*[^;]+;/);
    expect(css).toMatch(/\.home-page__profile-avatar\s*\{[^}]*background:\s*var\(--hibilio-color-primary\);[^}]*color:\s*var\(--hibilio-color-on-primary\);/);
  });
});
