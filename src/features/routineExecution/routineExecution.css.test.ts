import { describe, expect, it } from 'vitest';
// @ts-expect-error Vitest executes this test in Node, while app code intentionally excludes Node types.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/features/routineExecution/routineExecution.css', 'utf8');
const tokens = readFileSync('src/styles/tokens.css', 'utf8');

describe('routineExecution.css action buttons', () => {
  it('実行保留はライト・ダーク共通のprimary文字・枠とカード背景で、投稿ボタンと区別する', () => {
    expect(tokens).toMatch(/:root\s*\{[^}]*--hibilio-color-card:\s*[^;]+;[^}]*--hibilio-color-primary:\s*[^;]+;/);
    expect(tokens).toMatch(/\.hibilio-theme-dark\s*\{[^}]*--hibilio-color-card:\s*[^;]+;[^}]*--hibilio-color-primary:\s*[^;]+;/);
    expect(css).toMatch(/\.routine-execution-pause-action\s*\{[^}]*background-color:\s*var\(--hibilio-color-card\);[^}]*border:\s*1px solid var\(--hibilio-color-primary\);[^}]*color:\s*var\(--hibilio-color-primary\);/);
    expect(css).toMatch(/\.routine-execution-main-action\s*\{[^}]*background-color:\s*var\(--hibilio-color-primary\);[^}]*color:\s*var\(--hibilio-color-on-primary\);/);
  });

  it('実行保留は既存テーマtokenでhoverとfocus時にも見分けられる', () => {
    expect(css).toMatch(/\.routine-execution-pause-action:hover\s*\{[^}]*background-color:\s*var\(--hibilio-color-muted\);[^}]*border-color:\s*var\(--hibilio-color-primary\);[^}]*color:\s*var\(--hibilio-color-primary\);/);
    expect(css).toMatch(/\.routine-execution-pause-action:focus-visible\s*\{[^}]*background-color:\s*var\(--hibilio-color-muted\);[^}]*border-color:\s*var\(--hibilio-color-primary\);[^}]*color:\s*var\(--hibilio-color-primary\);[^}]*outline:\s*2px solid var\(--hibilio-color-primary\);[^}]*outline-offset:\s*2px;/);
  });
});
