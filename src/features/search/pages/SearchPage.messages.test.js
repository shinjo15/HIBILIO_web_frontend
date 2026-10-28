import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const searchPageSource = readFileSync(resolve(globalThis.process.cwd(), 'src/features/search/pages/SearchPage.tsx'), 'utf8');
const messages = JSON.parse(readFileSync(resolve(globalThis.process.cwd(), 'src/shared/message/message.json'), 'utf8'));

describe('SearchPage message reuse', () => {
  it('reuses the navigation account label and keeps the search-specific empty message', () => {
    expect(searchPageSource).toContain('messages.navigation.account');
    expect(searchPageSource).not.toContain('messages.search.tabs.accounts');
    expect(messages.search.tabs).not.toHaveProperty('accounts');
    expect(messages.search.accountsEmpty).toBe('該当するアカウントはありません');
  });
});
