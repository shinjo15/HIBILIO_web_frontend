import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/shared/components/executionHistoryCard.css'), 'utf8');
const accountStyles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/account/account.css'), 'utf8');

describe('execution history card styles', () => {
  it('投稿者と日時を一行目の両端に置き、作者省略時も日時を右上に残す', () => {
    expect(styles).toMatch(/\.execution-history-card__header[\s\S]*display: grid[\s\S]*grid-template-areas: 'author metadata' 'title title'/);
    expect(styles).toMatch(/\.execution-history-card__author[\s\S]*min-width: 0/);
    expect(styles).toMatch(/\.execution-history-card__metadata[\s\S]*grid-area: metadata[\s\S]*justify-self: end/);
  });

  it('後から読み込まれるaccount.cssより優先して縦積みgridを適用する', () => {
    const executionStyle = globalThis.document.createElement('style');
    executionStyle.textContent = styles;
    const accountStyle = globalThis.document.createElement('style');
    accountStyle.textContent = accountStyles;
    const card = globalThis.document.createElement('article');
    card.className = 'execution-history-card';
    const header = globalThis.document.createElement('div');
    header.className = 'account-page__card-header execution-history-card__header';
    card.append(header);
    globalThis.document.head.append(executionStyle, accountStyle);
    globalThis.document.body.append(card);

    expect(globalThis.getComputedStyle(header).display).toBe('grid');

    card.remove();
    executionStyle.remove();
    accountStyle.remove();
  });

  it('三点メニューはカードの右上にあり、狭い画面でも投稿者名を省略できる', () => {
    expect(styles).toMatch(/\.MuiIconButton-root\.execution-history-card__more[\s\S]*position: absolute[\s\S]*right: 8px/);
    expect(styles).toMatch(/\.MuiIconButton-root\.execution-history-card__more[\s\S]*height: 32px[\s\S]*width: 32px/);
    expect(styles).toMatch(/\.execution-history-card__metadata--with-menu \{\s*padding-right: 40px;/);
    expect(styles).toMatch(/\.execution-history-card__author \.routine-card__handle[\s\S]*overflow: hidden[\s\S]*text-overflow: ellipsis[\s\S]*white-space: nowrap/);
  });

  it('実行文言だけをアクセント色と太字にし、選択ボタンのfocusをカード境界で示す', () => {
    expect(styles).toMatch(/\.execution-history-card__action-label \{[\s\S]*color: var\(--hibilio-color-primary\);[\s\S]*font-weight: 600;/);
    expect(styles).toMatch(/\.execution-history-card:has\(\.execution-history-card__select:focus-visible\)[\s\S]*outline:/);
  });
});
