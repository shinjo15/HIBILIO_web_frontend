import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from './SearchPage';
import type { SearchService } from '../services/searchService';

const routineExecutionResult = {
  accountId: 'account-1', accountName: '実行者', iconImageUrl: null, itemType: 'routine_execution' as const,
  publishedAt: '2026-09-03T00:00:00+00:00', routineExecutionId: 'execution-1', routineId: 'routine-1', routineName: '朝のストレッチ', tags: ['朝活'],
};
const routinePostResult = { ...routineExecutionResult, accountName: '作成者', itemType: 'routine' as const, publishedAt: '2026-09-04T00:00:00+00:00', routineExecutionId: null, routineName: '夜の読書' };
const accountResult = { accountId: 'account-2', accountName: 'アリス', bio: '朝を大切にしています', iconImageUrl: null };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-09-05T00:00:00+00:00'));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function renderPage(service: SearchService) {
  return render(<MemoryRouter><SearchPage service={service} /></MemoryRouter>);
}

function setupUser() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

async function typeAndDebounce(user: ReturnType<typeof setupUser>, value: string) {
  await user.type(screen.getByRole('textbox', { name: '検索語' }), value);
  await vi.advanceTimersByTimeAsync(300);
}

describe('SearchPage', () => {
  it('検索実行ボタンを表示せず、連続入力後に一度だけ投稿検索を実行する', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ searchPage } as SearchService);

    expect(screen.queryByRole('button', { name: '検索' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '検索語' }), '朝');
    await vi.advanceTimersByTimeAsync(299);
    expect(searchPage).not.toHaveBeenCalled();
    await user.type(screen.getByRole('textbox', { name: '検索語' }), '活');
    await vi.advanceTimersByTimeAsync(350);
    await vi.runOnlyPendingTimersAsync();

    expect(searchPage).toHaveBeenCalledTimes(1);
    expect(searchPage).toHaveBeenCalledWith('routines', '朝活', 1);
    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
  });

  it('空白のみを送信せず、入力クリア直後に結果を消す', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ searchPage } as SearchService);

    await user.type(screen.getByRole('textbox', { name: '検索語' }), '   ');
    await vi.advanceTimersByTimeAsync(300);
    expect(searchPage).not.toHaveBeenCalled();

    await typeAndDebounce(user, '朝');
    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: '検索語' }));

    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(300);
    expect(searchPage).toHaveBeenCalledTimes(1);
  });

  it('投稿種別と公開日時を表示し、種別ごとの詳細へリンクする', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult, routinePostResult], total: 2 });
    const user = setupUser();
    renderPage({ searchPage } as SearchService);

    await typeAndDebounce(user, '朝');

    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '朝のストレッチ' })).toHaveAttribute('href', '/routines/routine-1/executions/execution-1');
    expect(screen.getByRole('link', { name: '夜の読書' })).toHaveAttribute('href', '/routines/routine-1');
    expect(screen.getByText('実行投稿')).toBeInTheDocument();
    expect(screen.getByText('ルーティン投稿')).toBeInTheDocument();
    expect(screen.getByText('2日前')).toBeInTheDocument();
    expect(screen.getByText('昨日')).toBeInTheDocument();
  });

  it('タブ切替は確定済みの検索語でAccount検索を最初から行い、遅延した投稿結果を混入させない', async () => {
    let resolveRoutine: ((result: { items: typeof routineExecutionResult[]; total: number }) => void) | undefined;
    let resolveAccounts: ((result: { items: typeof accountResult[]; total: number }) => void) | undefined;
    const searchPage = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRoutine = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveAccounts = resolve; }));
    const user = setupUser();
    renderPage({ searchPage } as SearchService);

    await typeAndDebounce(user, 'アリ');
    await user.click(screen.getByRole('tab', { name: 'Account' }));
    expect(searchPage).toHaveBeenLastCalledWith('accounts', 'アリ', 1);
    resolveRoutine?.({ items: [routineExecutionResult], total: 1 });
    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();

    resolveAccounts?.({ items: [accountResult], total: 1 });
    expect(await screen.findByRole('link', { name: 'アリス' })).toHaveAttribute('href', '/accounts/account-2');
    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();
  });

  it('続きを見るで次ページを追加し、追加読み込み中とtotal到達を表示へ反映する', async () => {
    let resolveNextPage: ((result: { items: typeof routineExecutionResult[]; total: number }) => void) | undefined;
    const searchPage = vi.fn()
      .mockResolvedValueOnce({ items: [routineExecutionResult], total: 2 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNextPage = resolve; }));
    const user = setupUser();
    renderPage({ searchPage } as SearchService);

    await typeAndDebounce(user, '朝');
    await screen.findByRole('heading', { name: '朝のストレッチ' });
    await user.click(screen.getByRole('button', { name: '続きを見る' }));
    expect(searchPage).toHaveBeenLastCalledWith('routines', '朝', 2);
    expect(screen.getByRole('button', { name: '続きを見る' })).toBeDisabled();
    expect(screen.getByText('さらに読み込んでいます…')).toBeInTheDocument();

    resolveNextPage?.({ items: [{ ...routineExecutionResult, routineName: '朝の読書', routineId: 'routine-2' }], total: 2 });
    expect(await screen.findByRole('heading', { name: '朝の読書' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '続きを見る' })).not.toBeInTheDocument();
  });

  it('検索失敗時は再試行できる', async () => {
    const searchPage = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ searchPage } as SearchService);

    await typeAndDebounce(user, '朝');
    expect(await screen.findByText('検索に失敗しました。時間をおいて再試行してください。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
    expect(searchPage).toHaveBeenCalledTimes(2);
  });
});
