import { describe, expect, it } from 'vitest';
// @ts-expect-error Vitest executes this test in Node, while app code intentionally excludes Node types.
import { readFileSync } from 'node:fs';

const appShellSource = readFileSync('src/shared/navigation/AppShell.tsx', 'utf8');
const appShellCss = readFileSync('src/shared/navigation/appShell.css', 'utf8');
const accountCss = readFileSync('src/features/account/account.css', 'utf8');
const accountBackButtonSource = readFileSync('src/features/account/components/AccountBackButton.tsx', 'utf8');
const accountRelationListCss = readFileSync('src/shared/components/accountRelationList.css', 'utf8');
const executionHistoryCardCss = readFileSync('src/shared/components/executionHistoryCard.css', 'utf8');
const operationIconsCss = readFileSync('src/styles/operationIcons.css', 'utf8');
const routineDetailCss = readFileSync('src/features/routineDetail/routineDetail.css', 'utf8');
const routineExecutionCss = readFileSync('src/features/routineExecution/routineExecution.css', 'utf8');
const routineFeedCss = readFileSync('src/features/routineFeed/routineFeed.css', 'utf8');

describe('operationIcons.css', () => {
  it('PCサイドナビの実DOMに限定してアイコンを25pxにする', () => {
    expect(appShellSource).toContain('className="hibilio-desktop-nav"');
    expect(appShellCss).toMatch(/\.hibilio-desktop-nav\s+\.MuiSvgIcon-root\s*\{[^}]*font-size:\s*25px\s*!important;/);
  });

  it('通知ベルはPCだけカード背景とborder tokenを使い、hover時は既存のmuted背景にする', () => {
    expect(appShellCss).toMatch(/@media \(min-width: 1200px\)\s*\{[\s\S]*?\.hibilio-notifications\.MuiIconButton-root\s*\{[^}]*background-color:\s*var\(--hibilio-color-card\);[^}]*border:\s*1px solid var\(--hibilio-color-border\);/);
    expect(appShellCss).toMatch(/@media \(min-width: 1200px\)\s*\{[\s\S]*?\.hibilio-notifications\.MuiIconButton-root:hover\s*\{[^}]*background-color:\s*var\(--hibilio-color-muted\)\s*!important;/);
  });

  it('ブロック解除の操作アイコンを約16pxにする', () => {
    expect(accountRelationListCss).toMatch(/\.account-relation-card-with-action__button svg\s*\{[^}]*height:\s*16px;[^}]*width:\s*16px;/);
  });

  it('文字と矢印で戻る公開アカウント操作の押下領域を40pxまで広げる', () => {
    expect(accountCss).toMatch(/\.account-page__back\s*\{[^}]*min-height:\s*40px;[^}]*padding:\s*8px;/);
  });

  it('公開アカウントの戻る操作は14pxの文字を保ち、矢印だけを約1.25倍にする', () => {
    expect(accountBackButtonSource).toContain('className="account-page__back-icon"');
    expect(accountBackButtonSource).toContain('<span>{messages.publicAccount.back}</span>');
    expect(accountCss).toMatch(/\.account-page__back\s*\{[^}]*font-size:\s*14px;/);
    expect(accountCss).toMatch(/\.account-page__back svg\s*\{[^}]*height:\s*18px;[^}]*width:\s*18px;/);
  });

  it('32pxと36px固定操作は30pxアイコンの余白を確保し、隣接する情報と重ならない', () => {
    expect(executionHistoryCardCss).toMatch(/\.MuiIconButton-root\.execution-history-card__more\s*\{[^}]*height:\s*32px;[^}]*padding:\s*1px;[^}]*width:\s*32px;/);
    expect(executionHistoryCardCss).toMatch(/\.execution-history-card__metadata--with-menu\s*\{[^}]*padding-right:\s*44px;/);
    expect(accountCss).toMatch(/\.account-profile__actions \.MuiIconButton-root\.account-page__more\s*\{[^}]*height:\s*36px;[^}]*padding:\s*3px;[^}]*width:\s*36px;/);
    expect(routineExecutionCss).toMatch(/\.routine-execution-header__back\s*\{[^}]*height:\s*32px;[^}]*padding:\s*1px;[^}]*width:\s*32px;/);
    expect(routineExecutionCss).toMatch(/\.routine-execution-icon\s*\{[^}]*height:\s*30px;[^}]*width:\s*30px;/);
    expect(routineFeedCss).toMatch(/\.MuiIconButton-root\.routine-card__more[^{]*\{[^}]*height:\s*32px;[^}]*padding:\s*1px;[^}]*width:\s*32px;/);
    expect(operationIconsCss).toMatch(/\.account-profile__actions \.MuiIconButton-root \.MuiSvgIcon-root,[\s\S]*?\.routine-feed-error__retry \.MuiSvgIcon-root\s*\{[^}]*font-size:\s*30px\s*!important;/);
  });

  it('モバイル詳細ヘッダーの戻る側と右spacerを同じ40px幅にする', () => {
    expect(routineDetailCss).toMatch(/@media \(max-width: 599px\)\s*\{[\s\S]*?\.routine-detail-header__back\s*\{[^}]*width:\s*40px;[\s\S]*?\.routine-detail-header__spacer\s*\{[^}]*width:\s*40px;/);
  });

  it('実DOMに使われない旧サイズ用classを残さない', () => {
    expect(operationIconsCss).not.toMatch(/\.hibilio-operation-icon--/);
  });
});
