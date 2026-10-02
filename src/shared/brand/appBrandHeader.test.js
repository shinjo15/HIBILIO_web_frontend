import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/shared/brand/appBrandHeader.css'), 'utf8');

describe('appBrandHeader styles', () => {
  it('hides the complete mobile-brand shell at desktop width with higher selector specificity', () => {
    expect(styles).toContain('@media (min-width: 1200px) {\n  .app-brand-header.app-brand-header {\n    display: none;');
  });

  it('resets typography margins so the sidebar-equivalent row and tagline spacing are explicit', () => {
    expect(styles).toContain('.app-brand-header .app-brand-header__name {\n  color: var(--hibilio-color-on-background);');
    expect(styles).toMatch(/\.app-brand-header \.app-brand-header__name \{[\s\S]*?font-family: Fraunces, serif;[\s\S]*?font-size: 20px;[\s\S]*?font-weight: 600;[\s\S]*?letter-spacing: 0\.04em;[\s\S]*?line-height: 1\.5;[\s\S]*?margin: 0;[\s\S]*?\}/);
    expect(styles).toMatch(/\.app-brand-header \.app-brand-header__tagline \{[\s\S]*?font-size: 12px;[\s\S]*?line-height: 1\.5;[\s\S]*?margin: 4px 0 0;[\s\S]*?\}/);
  });

  it('overrides MUI Stack defaults for the outer shell and horizontal brand row', () => {
    expect(styles).toContain('.app-brand-header.app-brand-header {\n  align-items: flex-start;\n  display: flex;\n  flex-direction: column;');
    expect(styles).toContain('.app-brand-header .app-brand-header__brand {\n  align-items: center;\n  display: flex;\n  flex-direction: row;\n  gap: 8px;');
  });
});
