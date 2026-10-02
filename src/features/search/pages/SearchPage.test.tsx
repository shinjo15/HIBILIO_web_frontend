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

function renderPage(service: Omit<SearchService, 'listPopularTags'> & Partial<Pick<SearchService, 'listPopularTags'>>) {
  return render(<MemoryRouter><SearchPage service={{ listPopularTags: async () => [], ...service }} /></MemoryRouter>);
}

function setupUser() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

async function typeAndDebounce(user: ReturnType<typeof setupUser>, value: string) {
  await user.type(screen.getByRole('textbox', { name: 'ルーティン名' }), value);
  await vi.advanceTimersByTimeAsync(300);
}

describe('SearchPage', () => {
  it('人気タグをAPI順で0件を含めて表示し、クリック検索後に解除すると復帰する', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({
      listAllTags: vi.fn().mockResolvedValue([]),
      listPopularTags: vi.fn().mockResolvedValue([{ identifier: 'first', label: '朝活', routineCount: 12 }, { identifier: 'second', label: '読書', routineCount: 4 }, { identifier: 'zero', label: '日記', routineCount: 0 }]),
      listTags: vi.fn().mockResolvedValue([{ identifier: 'first', label: '朝活' }]),
      searchPage,
    });

    expect(await screen.findByRole('heading', { name: '人気のタグ' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /#(朝活|読書|日記)/ }).map((button) => button.getAttribute('aria-label'))).toEqual(['#朝活 ルーティン 12件', '#読書 ルーティン 4件', '#日記 ルーティン 0件']);
    await user.click(screen.getByRole('tab', { name: 'Account' }));
    expect(screen.getByRole('heading', { name: '人気のタグ' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '#朝活 ルーティン 12件' }));
    expect(searchPage).toHaveBeenCalledWith('accounts', '', 1, ['first']);
    expect(screen.queryByRole('heading', { name: '人気のタグ' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '朝活' }));
    expect(await screen.findByRole('heading', { name: '人気のタグ' })).toBeInTheDocument();
  });

  it('人気タグが0件だけでも表示する', async () => {
    renderPage({ listAllTags: vi.fn().mockResolvedValue([]), listPopularTags: vi.fn().mockResolvedValue([{ identifier: 'zero', label: '日記', routineCount: 0 }]), listTags: vi.fn().mockResolvedValue([]), searchPage: vi.fn() });

    expect(await screen.findByRole('textbox', { name: 'ルーティン名' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '人気のタグ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#日記 ルーティン 0件' })).toBeInTheDocument();
  });

  it('人気タグAPIの全60件を0件を含めてレスポンス順で表示する', async () => {
    const popularTags = Array.from({ length: 60 }, (_, index) => ({ identifier: `tag-${index + 1}`, label: `タグ${index + 1}`, routineCount: index === 59 ? 0 : 60 - index }));
    renderPage({ listAllTags: vi.fn().mockResolvedValue([]), listPopularTags: vi.fn().mockResolvedValue(popularTags), listTags: vi.fn().mockResolvedValue([]), searchPage: vi.fn() });

    expect(await screen.findByRole('heading', { name: '人気のタグ' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /#タグ/ })).toHaveLength(60);
    expect(screen.getAllByRole('button', { name: /#タグ/ }).map((button) => button.getAttribute('aria-label'))).toEqual(popularTags.map((tag) => `#${tag.label} ルーティン ${tag.routineCount}件`));
    expect(screen.getByRole('button', { name: '#タグ60 ルーティン 0件' })).toBeInTheDocument();
  });

  it('人気タグの取得失敗時は表示しない', async () => {
    renderPage({ listAllTags: vi.fn().mockResolvedValue([]), listPopularTags: vi.fn().mockRejectedValue(new Error('network')), listTags: vi.fn().mockResolvedValue([]), searchPage: vi.fn() });

    expect(await screen.findByRole('textbox', { name: 'ルーティン名' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '人気のタグ' })).not.toBeInTheDocument();
  });

  it('スマホ用の共有ブランドヘッダーにタグラインを表示し、検索アイコンなしで検索対象の説明を切り替える', async () => {
    const user = setupUser();
    renderPage({ listAllTags: vi.fn().mockResolvedValue([]), listTags: vi.fn().mockResolvedValue([{ identifier: 'tag-1', label: '朝活' }]), searchPage: vi.fn().mockResolvedValue({ items: [], total: 0 }) });

    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.getByText('今日を重ねるSNS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ルーティンを検索' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'ルーティン名' })).toHaveAttribute('placeholder', 'ルーティン名を入力');
    await user.click(await screen.findByRole('button', { name: '朝活' }));
    await user.type(screen.getByRole('textbox', { name: 'ルーティン名' }), '朝');
    await user.click(screen.getByRole('tab', { name: 'Account' }));
    expect(screen.getByRole('textbox', { name: 'アカウント名' })).toHaveValue('朝');
    expect(screen.getByRole('textbox', { name: 'アカウント名' })).toHaveAttribute('placeholder', 'アカウント名を入力');
    expect(screen.getByRole('button', { name: '朝活' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('全件候補を閉じる操作を表示する', async () => {
    const user = setupUser();
    renderPage({ listAllTags: vi.fn().mockResolvedValue([{ identifier: 'all', label: '読書' }]), listTags: vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]), searchPage: vi.fn() });
    expect(screen.queryByRole('heading', { name: 'タグ' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '一覧を見る↓' }));
    expect(await screen.findByRole('button', { name: '閉じる↑' })).toHaveClass('search-page__close-tags');
    await user.click(screen.getByRole('button', { name: '閉じる↑' }));
    expect(screen.getByRole('button', { name: '一覧を見る↓' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    expect(screen.getByRole('button', { name: '閉じる↑' })).toBeInTheDocument();
  });

  it('タグ候補の読込中は見出し、読込テキスト、spinnerを表示せずタグ領域をbusyにする', () => {
    renderPage({ listAllTags: vi.fn().mockResolvedValue([]), listTags: vi.fn().mockImplementation(() => new Promise(() => {})), searchPage: vi.fn() });

    expect(screen.queryByRole('heading', { name: 'タグ' })).not.toBeInTheDocument();
    expect(screen.queryByText('タグを読み込んでいます…')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByLabelText('タグを絞り込む')).toHaveAttribute('aria-busy', 'true');
  });

  it('全件候補を読み込んでいる間もpickupタグを選択できる', async () => {
    const user = setupUser();
    renderPage({ listAllTags: vi.fn().mockImplementation(() => new Promise(() => {})), listTags: vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]), searchPage: vi.fn().mockResolvedValue({ items: [], total: 0 }) });
    await user.click(await screen.findByRole('button', { name: '朝活' }));
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    expect(screen.queryByText('タグを読み込んでいます…')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByLabelText('タグを絞り込む')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '朝活' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('タグ取得失敗後に再試行して候補を表示する', async () => {
    const listTags = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([{ identifier: 'tag-1', label: '朝活' }]);
    const user = setupUser();
    renderPage({ listAllTags: vi.fn().mockResolvedValue([]), listTags, searchPage: vi.fn() });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(await screen.findByText('タグを読み込めませんでした。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('button', { name: '朝活' })).toBeInTheDocument();
    expect(listTags).toHaveBeenCalledTimes(2);
  });

  it('閉じるとpickup候補へ即時復帰し、選択済み全件タグと検索結果を維持する', async () => {
    const listTags = vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]);
    const listAllTags = vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }, { identifier: 'book', label: '読書' }, { identifier: 'diary', label: '日記' }]);
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ listAllTags, listTags, searchPage });
    await screen.findByRole('button', { name: '朝活' });
    expect(listTags).toHaveBeenCalledTimes(1);
    expect(listAllTags).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    await user.click(await screen.findByRole('button', { name: '読書' }));
    await screen.findByRole('heading', { name: '朝のストレッチ' });
    const before = searchPage.mock.calls.length;
    await user.click(screen.getByRole('button', { name: '閉じる↑' }));
    expect(screen.queryByRole('button', { name: '日記' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '朝活' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '読書' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
    expect(searchPage).toHaveBeenCalledTimes(before);
    expect(listTags).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    expect(await screen.findByRole('button', { name: '日記' })).toBeInTheDocument();
    expect(listAllTags).toHaveBeenCalledTimes(1);
  });

  it('閉じた後に古い全件応答を隔離し、再展開時だけ再取得する', async () => {
    let resolveFirst: ((tags: Array<{ identifier: string; label: string }>) => void) | undefined;
    const listAllTags = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([{ identifier: 'pickup', label: '朝活' }, { identifier: 'diary', label: '日記' }]);
    const user = setupUser();
    renderPage({ listAllTags, listTags: vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]), searchPage: vi.fn() });
    await screen.findByRole('button', { name: '朝活' });
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    await user.click(screen.getByRole('button', { name: '閉じる↑' }));
    resolveFirst?.([{ identifier: 'pickup', label: '朝活' }, { identifier: 'diary', label: '日記' }]);
    expect(screen.queryByRole('button', { name: '日記' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    expect(await screen.findByRole('button', { name: '日記' })).toBeInTheDocument();
    expect(listAllTags).toHaveBeenCalledTimes(2);
  });

  it('一覧を見る操作でpickup候補を残したまま全件候補へ切り替える', async () => {
    let resolveAllTags: ((tags: Array<{ identifier: string; label: string }>) => void) | undefined;
    const listAllTags = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveAllTags = resolve; }));
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ listAllTags, listTags: vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]), searchPage });
    await user.click(await screen.findByRole('button', { name: '朝活' }));
    expect(listAllTags).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    expect(listAllTags).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '朝活' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '朝活' })).toBeEnabled();
    resolveAllTags?.([{ identifier: 'pickup', label: '朝活' }, { identifier: 'all', label: '読書' }]);
    expect(await screen.findByRole('button', { name: '読書' })).toBeInTheDocument();
    expect(searchPage).toHaveBeenCalledTimes(1);
  });

  it('全件候補にない選択pickupタグを表示して解除できる', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ listAllTags: vi.fn().mockResolvedValue([{ identifier: 'all', label: '読書' }]), listTags: vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]), searchPage });
    await user.click(await screen.findByRole('button', { name: '朝活' }));
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    expect(await screen.findByRole('button', { name: '読書' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '朝活' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '朝活' }));
    expect(screen.queryByRole('button', { name: '朝活' })).not.toBeInTheDocument();
  });

  it('全件取得失敗後もpickup候補を維持し、再試行で全件候補を表示する', async () => {
    const listAllTags = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([{ identifier: 'all', label: '読書' }]);
    const user = setupUser();
    renderPage({ listAllTags, listTags: vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]), searchPage: vi.fn() });
    await screen.findByRole('button', { name: '朝活' });
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    expect(await screen.findByText('タグを読み込めませんでした。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '朝活' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('button', { name: '読書' })).toBeInTheDocument();
  });

  it('文字列とタグ選択後の全件候補取得で検索を再実行しない', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ listAllTags: vi.fn().mockResolvedValue([{ identifier: 'all', label: '読書' }]), listTags: vi.fn().mockResolvedValue([{ identifier: 'pickup', label: '朝活' }]), searchPage });
    await user.click(await screen.findByRole('button', { name: '朝活' }));
    await typeAndDebounce(user, '朝');
    await vi.runOnlyPendingTimersAsync();
    const before = searchPage.mock.calls.length;
    await user.click(screen.getByRole('button', { name: '一覧を見る↓' }));
    await screen.findByRole('button', { name: '読書' });
    expect(searchPage).toHaveBeenCalledTimes(before);
  });

  it('タグ候補を表示し、選択時に文字列なしでも即時検索する', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const listTags = vi.fn().mockResolvedValue([{ identifier: 'tag-1', label: '朝活' }]);
    const user = setupUser();
    renderPage({ listTags, searchPage } as unknown as SearchService);

    await user.click(await screen.findByRole('button', { name: '朝活' }));

    expect(searchPage).toHaveBeenCalledWith('routines', '', 1, ['tag-1']);
    expect(screen.getByRole('button', { name: '朝活' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('タグ選択中の入力変更ではdebounce確定まで検索せず、旧結果を隠す', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const listTags = vi.fn().mockResolvedValue([{ identifier: 'tag-1', label: '朝活' }]);
    const user = setupUser();
    renderPage({ listTags, searchPage } as unknown as SearchService);
    await user.click(await screen.findByRole('button', { name: '朝活' }));
    await screen.findByRole('heading', { name: '朝のストレッチ' });
    await user.type(screen.getByRole('textbox', { name: 'ルーティン名' }), '朝');
    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();
    expect(searchPage).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runOnlyPendingTimersAsync();
    expect(searchPage).toHaveBeenLastCalledWith('routines', '朝', 1, ['tag-1']);
  });
  it('入力debounce中にタブを切り替えると確定語でAccount検索する', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [accountResult], total: 1 });
    const user = setupUser();
    renderPage({ listAllTags: vi.fn().mockResolvedValue([]), listTags: vi.fn().mockResolvedValue([]), searchPage });
    await user.type(screen.getByRole('textbox', { name: 'ルーティン名' }), 'アリ');
    await user.click(screen.getByRole('tab', { name: 'Account' }));
    expect(searchPage).toHaveBeenCalledWith('accounts', 'アリ', 1);
    expect(await screen.findByRole('link', { name: 'アリス' })).toBeInTheDocument();
  });

  it('検索実行ボタンを表示せず、連続入力後に一度だけ投稿検索を実行する', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ searchPage } as unknown as SearchService);

    expect(screen.queryByRole('button', { name: '検索' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'ルーティン名' }), '朝');
    await vi.advanceTimersByTimeAsync(299);
    expect(searchPage).not.toHaveBeenCalled();
    await user.type(screen.getByRole('textbox', { name: 'ルーティン名' }), '活');
    await vi.advanceTimersByTimeAsync(350);
    await vi.runOnlyPendingTimersAsync();

    expect(searchPage).toHaveBeenCalledTimes(1);
    expect(searchPage).toHaveBeenCalledWith('routines', '朝活', 1);
    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
  });

  it('空白のみを送信せず、入力クリア直後に結果を消す', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult], total: 1 });
    const user = setupUser();
    renderPage({ searchPage } as unknown as SearchService);

    await user.type(screen.getByRole('textbox', { name: 'ルーティン名' }), '   ');
    await vi.advanceTimersByTimeAsync(300);
    expect(searchPage).not.toHaveBeenCalled();

    await typeAndDebounce(user, '朝');
    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'ルーティン名' }));

    expect(screen.queryByRole('heading', { name: '朝のストレッチ' })).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(300);
    expect(searchPage).toHaveBeenCalledTimes(1);
  });

  it('投稿種別と公開日時を表示し、種別ごとの詳細へリンクする', async () => {
    const searchPage = vi.fn().mockResolvedValue({ items: [routineExecutionResult, routinePostResult], total: 2 });
    const user = setupUser();
    renderPage({ searchPage } as unknown as SearchService);

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
    renderPage({ searchPage } as unknown as SearchService);

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
    renderPage({ searchPage } as unknown as SearchService);

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
    renderPage({ searchPage } as unknown as SearchService);

    await typeAndDebounce(user, '朝');
    expect(await screen.findByText('検索に失敗しました。時間をおいて再試行してください。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('heading', { name: '朝のストレッチ' })).toBeInTheDocument();
    expect(searchPage).toHaveBeenCalledTimes(2);
  });
});
