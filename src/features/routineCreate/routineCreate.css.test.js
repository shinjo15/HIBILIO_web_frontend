import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/routineCreate/routineCreate.css'), 'utf8');

describe('routine create desktop submit styles', () => {
  it('shows a fixed content-width submit control only at the desktop navigation breakpoint', () => {
    expect(styles).toContain('.routine-create-desktop-submit {\n  display: none;');
    expect(styles).toMatch(/@media \(min-width: 1200px\) \{[\s\S]*?\.routine-create-desktop-submit \{(?=[\s\S]*?bottom: 24px;)(?=[\s\S]*?display: flex;)(?=[\s\S]*?left: 224px;)(?=[\s\S]*?position: fixed;)(?=[\s\S]*?right: 0;)[\s\S]*?\}/);
    expect(styles).toMatch(/\.routine-create-desktop-submit__button \{(?=[\s\S]*?max-width: 672px;)(?=[\s\S]*?width: calc\(100% - 32px\);)[\s\S]*?\}/);
  });
});
