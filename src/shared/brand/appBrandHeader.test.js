import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/shared/brand/appBrandHeader.css'), 'utf8');

describe('appBrandHeader styles', () => {
  it('hides the MUI Stack brand at desktop width with higher selector specificity', () => {
    expect(styles).toContain('@media (min-width: 1200px) {\n  .app-brand-header .app-brand-header__brand {\n    display: none;');
    expect(styles).toContain('  .app-brand-header.app-brand-header {\n    justify-content: flex-end;');
  });
});
