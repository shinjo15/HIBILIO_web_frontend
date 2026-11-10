import { describe, expect, it } from 'vitest';
// @ts-expect-error Vitest executes this test in Node, while app code intentionally excludes Node types.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/features/notifications/notifications.css', 'utf8');

describe('notifications.css', () => {
  it('未読ラインを左から8px・上下に余白を取った角丸縦線で表示し、本文と重ならない共有paddingを使う', () => {
    expect(css).toMatch(/\.notifications-page__item\s*\{[^}]*padding:\s*16px 20px;[^}]*position:\s*relative;/);
    expect(css).toMatch(/\.notifications-page__item--unread::before\s*\{[^}]*background:\s*var\(--hibilio-color-primary\);[^}]*border-radius:\s*999px;[^}]*bottom:\s*12px;[^}]*content:\s*'';[^}]*left:\s*8px;[^}]*position:\s*absolute;[^}]*top:\s*12px;[^}]*width:\s*4px;/);
    expect(css).not.toMatch(/\.notifications-page__item--unread\s*\{[^}]*padding(?:-left)?:/);
  });

  it('未読行のタップ操作とキーボードfocus表示を維持する', () => {
    expect(css).toMatch(/\.notifications-page__item--actionable\s*\{[^}]*cursor:\s*pointer;/);
    expect(css).toMatch(/\.notifications-page__item--actionable:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--hibilio-color-primary\);/);
  });
});
