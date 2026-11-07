import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/account/account.css'), 'utf8');

describe('account tab styles', () => {
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
