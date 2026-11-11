import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/account/account.css'), 'utf8');

describe('account tab styles', () => {
  it('keeps an own-account level immediately after a short name and wraps a long name within the viewport', () => {
    expect(styles).toContain('.account-profile__name-row {\n  align-items: baseline;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px 8px;\n  min-width: 0;\n}');
    expect(styles).toContain('.account-profile__name-row .account-profile__name {\n  flex: 0 1 auto;\n  max-width: 100%;\n  min-width: 0;\n  overflow-wrap: anywhere;\n}');
    expect(styles).not.toContain('flex: 1 1 12rem;');

    expect(styles).toContain('.account-profile__level {\n  border-left: 1px solid var(--hibilio-color-border);\n  color: var(--hibilio-color-primary);\n  flex: 0 0 auto;\n  font-size: 12px;\n  font-weight: 600;\n  line-height: 1;\n  padding-left: 8px;\n  white-space: nowrap;\n}');
    expect(styles).not.toContain('.account-profile__level {\n  background');
  });

  it('keeps five to seven own-account tabs on one scrollable row at mobile widths without wrapping labels', () => {
    expect(styles).toContain(`@media (max-width: 480px) {
  .account-tabs--five,
  .account-tabs--six,
  .account-tabs--seven {
    display: flex;
    overflow-x: auto;
  }

  .account-tabs--five .account-tabs__tab,
  .account-tabs--six .account-tabs__tab,
  .account-tabs--seven .account-tabs__tab {
    flex: 0 0 auto;
    min-width: 96px;
    width: max-content;
  }

  .account-tabs--five .account-tabs__label,
  .account-tabs--six .account-tabs__label,
  .account-tabs--seven .account-tabs__label {
    overflow-wrap: normal;
    white-space: nowrap;
  }
}`);
  });

  it('keeps the desktop five- to seven-tab grid layouts unchanged', () => {
    expect(styles).toContain('.account-tabs--five {\n  grid-template-columns: repeat(5, minmax(0, 1fr));\n}');
    expect(styles).toContain('.account-tabs--six {\n  grid-template-columns: repeat(6, minmax(0, 1fr));\n}');
    expect(styles).toContain('.account-tabs--seven {\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n}');
  });
});
