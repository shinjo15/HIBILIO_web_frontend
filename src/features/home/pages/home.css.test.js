import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(globalThis.process.cwd(), 'src/features/home/pages/home.css'), 'utf8');

describe('home page styles', () => {
  it('PC Homeのコンテンツ幅に合わせ、日付不明履歴をカレンダーの下に表示する', () => {
    expect(styles).toContain('max-width: 960px;');
    expect(styles).toContain('.home-page__history-desktop {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  min-width: 0;');
    expect(styles).not.toContain('.home-page__history-desktop {\n  display: grid;');
    expect(styles).toContain('box-sizing: border-box;');
    expect(styles).toContain('width: 100%;');
    expect(styles).toContain('.home-page__calendar {\n  background-color: var(--hibilio-color-card);\n  border: 1px solid var(--hibilio-color-primary);\n}');
    expect(styles).toContain('.home-page__undated {\n  border: 1px solid var(--hibilio-color-border);\n}');
  });

  it('狭い幅でも未来日の日付を薄いグレーで表示し、日付セルと長い履歴タイトルを幅内に収める', () => {
    expect(styles).toContain('.home-page__calendar-day {\n  border: 1px solid var(--hibilio-color-border);\n  min-height: 72px;\n  min-width: 0;');
    expect(styles).toContain('.home-page__calendar-day--future > span {\n  color: var(--hibilio-color-muted-text);\n}');
    expect(styles).toContain('max-width: 100%;');
    expect(styles).toContain('text-overflow: ellipsis;');
  });

  it('いいねカードを横スワイプ可能なスナップ付きの一列に保つ', () => {
    expect(styles).toContain('.home-page__likes-scroll {\n  display: flex;\n  gap: 12px;\n  overflow-x: auto;');
    expect(styles).toContain('overscroll-behavior-inline: contain;');
    expect(styles).toContain('scroll-snap-type: inline mandatory;');
    expect(styles).toContain('touch-action: pan-x;');
    expect(styles).toContain('.home-page__likes-scroll .routine-card {\n  flex: 0 0 min(100%, 400px);');
    expect(styles).toContain('scroll-snap-align: start;');
  });

  it('モバイルでも横スワイプ用カード幅を画面内に保つ', () => {
    expect(styles).toContain('@media (max-width: 599px) {');
    expect(styles).toContain('.home-page__likes-scroll .routine-card {\n    flex-basis: min(100%, calc(100vw - 48px));');
  });

  it('実行中ルーティンカードは既存ルーティンカードと同じprimary枠線のhover transitionを使い、focus可視性を維持する', () => {
    const draftRule = styles.match(/\.home-page__execution-draft\s*\{([^}]*)\}/)?.[1];
    const hoverRule = styles.match(/\.home-page__execution-draft:hover\s*\{([^}]*)\}/)?.[1];
    const focusRule = styles.match(/\.home-page__execution-draft:focus-visible\s*\{([^}]*)\}/)?.[1];

    expect(draftRule).toMatch(/transition:\s*border-color 150ms ease;/);
    expect(hoverRule).toMatch(/border-color:\s*var\(--hibilio-color-primary\);/);
    expect(hoverRule).not.toMatch(/background(?:-color)?:/);
    expect(focusRule).toMatch(/outline:\s*2px solid var\(--hibilio-color-primary\);/);
    expect(focusRule).toMatch(/outline-offset:\s*2px;/);
  });

  it('削除modeのキャンセルは実行保留と同じ背景・枠・文字になり、状態別の宣言は削除ボタンより優先される', () => {
    const { document } = globalThis;
    const style = document.createElement('style');
    style.textContent = styles
      .replaceAll('var(--hibilio-color-card)', 'rgb(255, 255, 255)')
      .replaceAll('var(--hibilio-color-muted)', 'rgb(240, 240, 240)')
      .replaceAll('var(--hibilio-color-on-primary)', 'rgb(255, 255, 255)')
      .replaceAll('var(--hibilio-color-primary)', 'rgb(0, 128, 0)');
    const actions = document.createElement('div');
    actions.className = 'home-page__execution-draft-actions';
    const deleteButton = document.createElement('button');
    const cancelButton = document.createElement('button');
    cancelButton.className = 'home-page__execution-draft-cancel';
    actions.append(deleteButton, cancelButton);
    document.head.append(style);
    document.body.append(actions);

    const cancelStyle = globalThis.getComputedStyle(cancelButton);
    const deleteStyle = globalThis.getComputedStyle(deleteButton);
    expect(cancelStyle.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(cancelStyle.border).toBe('1px solid rgb(0, 128, 0)');
    expect(cancelStyle.color).toBe('rgb(0, 128, 0)');
    expect(deleteStyle.backgroundColor).toBe('rgb(0, 128, 0)');
    expect(deleteStyle.borderWidth).toBe('0px');
    expect(deleteStyle.color).toBe('rgb(255, 255, 255)');

    const rules = [...style.sheet.cssRules];
    const cancelSelector = '.home-page__execution-draft-actions .home-page__execution-draft-cancel';
    const cancelRule = (selector) => rules.find((rule) => rule.selectorText === selector)?.style;
    expect(cancelRule(cancelSelector)).toBeDefined();
    expect(cancelRule(`${cancelSelector}:hover`)?.backgroundColor).toBe('rgb(240, 240, 240)');
    expect(cancelRule(`${cancelSelector}:hover`)?.borderColor).toBe('rgb(0, 128, 0)');
    expect(cancelRule(`${cancelSelector}:hover`)?.color).toBe('rgb(0, 128, 0)');
    expect(cancelRule(`${cancelSelector}:focus-visible`)?.backgroundColor).toBe('rgb(240, 240, 240)');
    expect(cancelRule(`${cancelSelector}:focus-visible`)?.outline).toBe('2px solid rgb(0, 128, 0)');
    expect(cancelRule(`${cancelSelector}:disabled`)?.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(cancelRule(`${cancelSelector}:disabled`)?.borderColor).toBe('rgb(0, 128, 0)');
    expect(cancelRule(`${cancelSelector}:disabled`)?.color).toBe('rgb(0, 128, 0)');

    actions.remove();
    style.remove();
  });

  it('削除modeのルーティン名はチェックボックスの隣から左寄せで折り返せる', () => {
    const selectRule = styles.match(/\.home-page__execution-draft--select\s*\{([^}]*)\}/)?.[1];
    const nameRule = styles.match(/\.home-page__execution-draft--select > span\s*\{([^}]*)\}/)?.[1];

    expect(selectRule).toMatch(/justify-content:\s*flex-start;/);
    expect(nameRule).toMatch(/min-width:\s*0;/);
    expect(nameRule).toMatch(/overflow-wrap:\s*anywhere;/);
  });
});