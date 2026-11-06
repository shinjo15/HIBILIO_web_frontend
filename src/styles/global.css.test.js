import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/styles/global.css'), 'utf8');

describe('iPhone Safari input zoom styles', () => {
  it('sets text-entry controls to 16px on touch iOS Safari with cascade priority over component styles', () => {
    expect(styles).toMatch(/@supports \(-webkit-touch-callout: none\) \{\s*@media \(any-pointer: coarse\) \{/);
    expect(styles).toMatch(/input:not\(\[type="checkbox"\], \[type="radio"\], \[type="file"\], \[type="hidden"\], \[type="range"\], \[type="color"\]\),\s*textarea \{\s*font-size: 16px !important;\s*\}/);
  });

  it('does not target checkbox, radio, file, hidden, range, or color controls', () => {
    expect(styles).toContain('input:not([type="checkbox"], [type="radio"], [type="file"], [type="hidden"], [type="range"], [type="color"])');
  });
});
