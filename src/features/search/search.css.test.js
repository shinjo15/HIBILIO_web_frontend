import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/search/search.css'), 'utf8');
const routineFeedStyles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/routineFeed/routineFeed.css'), 'utf8');
const routineFeedTypographyStyles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/routineFeed/routineFeedTypography.css'), 'utf8');

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

  it('keeps pickup tags in one horizontal scroll row and only expands all tags into a bounded vertical list', () => {
    expect(styles).toContain('.search-page__tags {\n  flex-wrap: nowrap;\n  gap: 8px;\n  overflow-x: auto;\n  overflow-y: hidden;\n  padding-bottom: 12px;');
    expect(styles).toContain('.search-page__tags--expanded {\n  flex-wrap: wrap;\n  max-height: min(45vh, 320px);\n  overflow-x: hidden;\n  overflow-y: auto;');
    expect(styles).toContain('.search-page__tags .MuiButton-root {\n  flex: 0 0 auto;\n  min-height: 40px;\n  padding: 6px 12px;');
    expect(styles).toContain('.search-page__close-tags.MuiButton-root {\n  font-weight: 600;\n  margin-top: 8px;\n  min-height: 44px;\n  padding: 10px 16px;');
  });

  it('scopes feed card styles to search results without applying feed page sizing', () => {
    expect(routineFeedStyles).toContain('.routine-feed-card-scope .MuiPaper-root.routine-card');
    expect(routineFeedStyles).toContain('.routine-feed-card-scope .routine-card__actions');
    expect(routineFeedStyles).toContain('.routine-feed-card-scope .routine-feed-execution-post');
    expect(routineFeedStyles).not.toContain('.routine-feed-card-scope {\n  min-height: 100dvh;');
    expect(routineFeedTypographyStyles).toContain('.routine-feed-card-scope .routine-card__title');
    expect(routineFeedTypographyStyles).toContain('.routine-feed-card-scope .routine-card__step');
  });

});
