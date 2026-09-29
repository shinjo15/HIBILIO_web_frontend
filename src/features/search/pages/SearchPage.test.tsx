import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from './SearchPage';
import type { SearchService } from '../services/searchService';

const routineResult = {
  accountId: 'account-1', accountName: '実行者', iconImageUrl: null, itemType: 'routine_execution' as const,
  publishedAt: '2026-09-03T00:00:00+00:00', routineExecutionId: 'execution-1', routineId: 'routine-1', routineName: '朝のストレッチ', tags: ['朝活'],
};
const routinePostResult = { ...routineResult, accountName: '作成者', itemType: 'routine' as const, publishedAt: '2026-09-04T00:00:00+00:00', routineExecutionId: null, routineName: '夜の読書' };
const accountResult = { accountId: 'account-2', accountName: 'アリス', bio: '朝を大切にしています', iconImageUrl: null };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function renderPage(service: SearchService) {
  return render(<MemoryRouter><SearchPage service={service} /></MemoryRouter>);
}

describe('SearchPage', () => {
  it('空白だけの検索語を送信せず、投稿検索結果を実行投稿の詳細リンク付きで表示する', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-05T00:00:00+00:00'));
    const searchPage = vi.fn().mockResolvedValue({ items: [routineResult], total: 1 });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage({ searchPage } as SearchService);

    await user.type(screen.getByRole('textbox', { name: '検索語' }), '   ');
    await user.click(screen.getByRole('button', { name: '検索' }));
    expect(searchPage).not.toHaveBeenCalled();

    await user.clear(screen.getByRole('textbox', { name: '検索語' }));
    await user.type(screen.getByRole('textbox', { name: '検索語' }), '朝');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '朝のストレッチ' })).toHaveAttribute('href', '/routines/routine-1/executions/execution-1');
    expect(screen.getByRole('link', { name: '実行者' })).toHaveAttribute('href', '/accounts/account-1');
    expect(screen.getByText('実行投稿')).toBeInTheDocument();
    expect(screen.getByText('2日前')).toBeInTheDocument();
    expect(searchPage).toHaveBeenCalledWith('routines', '朝', 1);
  });

  it('Routine投稿には種別と公開日時を表示し、Routine詳細へリンクする', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-05T00:00:00+00:00'));
    const searchPage = vi.fn().mockResolvedValue({ items: [routinePostResult], total: 1 });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage({ searchPage } as SearchService);

    await user.type(screen.getByRole('textbox', { name: '検索語' }), '夜');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(await screen.findByRole('heading', { name: '夜の読書' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '夜の読書' })).toHaveAttribute('href', '/routines/routine-1');
    expect(screen.getByText('ルーティン投稿')).toBeInTheDocument();
    expect(screen.getByText('昨日')).toBeInTheDocument();
  });

  it('Accountタブでは名前、自己紹介、既存Avatarフォールバックを表示し詳細へ遷移できる', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [accountResult], total: 1 });
    const user = userEvent.setup();
    renderPage({ searchPage } as SearchService);

    await user.click(screen.getByRole('tab', { name: 'Account' }));
    await user.type(screen.getByRole('textbox', { name: '検索語' }), 'アリ');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(await screen.findByRole('link', { name: 'アリス' })).toHaveAttribute('href', '/accounts/account-2');
    expect(screen.getByText('朝を大切にしています')).toBeInTheDocument();
    expect(screen.getByText('ア')).toBeInTheDocument();
    expect(searchPage).toHaveBeenCalledWith('accounts', 'アリ', 1);
  });

  it('検索語またはタブの変更直後に旧結果を消し、遅延応答後も再表示しない', async () => {
    let resolveNewRoutineSearch: ((result: { items: typeof routineResult[]; total: number }) => void) | undefined;
    let resolveAccountSearch: ((result: { items: typeof accountResult[]; total: number }) => void) | undefined;
    const searchPage = vi.fn()
      .mockResolvedValueOnce({ items: [routineResult], total: 1 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewRoutineSearch = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveAccountSearch = resolve; }));
    const user = userEvent.setup();
    renderPage({ searchPage } as SearchService);

    await user.type(screen.getByRole('textbox', { name: '検索語' }), '朝');
    await user.click(screen.getByRole('button', { name: '検索' }));
    await screen.findByRole('heading', { name: '朝のストレッチ' });
    await user.clear(screen.getByRole('textbox', { name: '検索語' }));
    await user.type(screen.getByRole('textbox', { name: '検索語' }), '夜');
    await user.click(screen.getByRole('button', { name: '検索' }));

    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Account' }));
    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();

    resolveNewRoutineSearch?.({ items: [routineResult], total: 1 });
    resolveAccountSearch?.({ items: [accountResult], total: 1 });
    expect(await screen.findByRole('link', { name: 'アリス' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();
  });

  it('続きを見るを押すと次ページを読み込み、total到達後は操作を表示しない', async () => {
    let resolveNextPage: ((result: { items: typeof routineResult[]; total: number }) => void) | undefined;
    const searchPage = vi.fn()
      .mockResolvedValueOnce({ items: [routineResult], total: 2 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNextPage = resolve; }));
    const user = userEvent.setup();
    renderPage({ searchPage } as SearchService);

    await user.type(screen.getByRole('textbox', { name: '検索語' }), '朝');
    await user.click(screen.getByRole('button', { name: '検索' }));
    await screen.findByRole('heading', { name: '朝のストレッチ' });
    await user.click(screen.getByRole('button', { name: '続きを見る' }));

    expect(searchPage).toHaveBeenLastCalledWith('routines', '朝', 2);
    expect(screen.getByRole('button', { name: '続きを見る' })).toBeDisabled();
    expect(screen.getByText('さらに読み込んでいます…')).toBeInTheDocument();

    resolveNextPage?.({ items: [{ ...routineResult, routineName: '夜の読書', routineId: 'routine-2' }], total: 2 });
    expect(await screen.findByRole('heading', { name: '夜の読書' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '続きを見る' })).not.toBeInTheDocument();
  });

  it('0件と失敗時の再試行を区別する', async () => {
    const searchPage = vi.fn()
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ items: [routineResult], total: 1 });
    const user = userEvent.setup();
    renderPage({ searchPage } as SearchService);

    await user.type(screen.getByRole('textbox', { name: '検索語' }), '朝');
    await user.click(screen.getByRole('button', { name: '検索' }));
    expect(await screen.findByText('該当する投稿はありません')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '検索' }));
    expect(await screen.findByText('検索に失敗しました。時間をおいて再試行してください。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
  });
});
