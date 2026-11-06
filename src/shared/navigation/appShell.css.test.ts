import { describe, expect, it } from 'vitest';
// @ts-expect-error Vitest executes this test in Node, while app code intentionally excludes Node types.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/shared/navigation/appShell.css', 'utf8');

describe('appShell.css', () => {
  it('PC作成ボタンを約46px、モバイル作成アイコンを60pxに保つ', () => {
    expect(css).toMatch(/\.hibilio-desktop-nav__create-trigger\.MuiListItemButton-root\s*\{[^}]*min-height:\s*46px;/);
    expect(css).toMatch(/\.hibilio-mobile-nav__create-icon--enlarged\.MuiBox-root\s*\{[^}]*height:\s*60px\s*!important;[^}]*width:\s*60px\s*!important;/);
  });

  it('作成画面のアニメーションは操作を妨げず、reduced motionでは停止する', () => {
    expect(css).toMatch(/\.hibilio-mobile-nav__create-trigger--attention[^}]*::after\s*\{[^}]*pointer-events:\s*none;/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.hibilio-mobile-nav__create-trigger--attention[\s\S]*?animation:\s*none;/);
  });

  it('モバイル案内は投稿ボタンをposition親として矢印を向け、フェードアウトする', () => {
    expect(css).toMatch(/\.hibilio-mobile-nav__create-trigger\.MuiButtonBase-root\s*\{[^}]*position:\s*relative;/);
    expect(css).toMatch(/\.hibilio-mobile-nav__create-guide--fading\.MuiBox-root\s*\{[^}]*animation:\s*hibilio-create-guide-fade-out\s+300ms/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.hibilio-mobile-nav__create-guide--fading[\s\S]*?animation:\s*none;/);
  });

  it('1200px以上ではモバイルナビを隠し、PCナビと切り替える', () => {
    expect(css).toMatch(/@media \(min-width: 1200px\)\s*\{[\s\S]*?\.hibilio-mobile-nav\.MuiBox-root\s*\{[^}]*display:\s*none;/);
  });
});