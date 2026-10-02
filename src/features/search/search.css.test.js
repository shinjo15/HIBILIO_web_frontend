import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/search/search.css'), 'utf8');

describe('search page central column styles', () => {
  it('keeps popular tags and every search result state inside a feed-like bordered card column', () => {
    expect(styles).toMatch(/\.search-page__main-column \{(?=[\s\S]*?background-color: var\(--hibilio-color-card\);)(?=[\s\S]*?border-left: 1px solid var\(--hibilio-color-border\);)(?=[\s\S]*?border-right: 1px solid var\(--hibilio-color-border\);)(?=[\s\S]*?box-sizing: border-box;)(?=[\s\S]*?margin: 0 auto;)(?=[\s\S]*?max-width: 672px;)[\s\S]*?\}/);
    expect(styles).toContain('.search-page__content {\n  padding: 16px;');
    expect(styles).not.toContain('.search-page__content {\n  box-sizing: border-box;');
    expect(styles).not.toContain('.search-page__popular {\n  margin: 0 auto;');
  });

  it('fills only the viewport height remaining below the sticky header', () => {
    expect(styles).toContain('.search-page {\n  display: flex;\n  flex-direction: column;\n  min-height: 100dvh;');
    expect(styles).toMatch(/\.search-page__main-column \{(?=[\s\S]*?flex: 1;)(?=[\s\S]*?width: 100%;)[\s\S]*?\}/);
    expect(styles).not.toContain('min-height: calc(100dvh - 1px);');
  });

  it('removes the empty shared-header row on desktop when search has no search control', () => {
    expect(styles).toContain('@media (min-width: 1200px) {\n  .search-page__header .app-brand-header {\n    display: none;');
  });
});
