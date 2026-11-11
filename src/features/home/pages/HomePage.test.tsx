import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthenticated, markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';
import type { AccountExecutionSummary } from '../../account/domain/account';
import type { Routine } from '../../routineFeed/domain/routine';
import { AccountUnauthorizedError, type AccountService } from '../../account/services/accountService';
import { HomePage } from './HomePage';

afterEach(() => {
  cleanup();
  resetAuthenticationForTesting();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('ログイン状態にかかわらず、本人プロフィールとは別に一覧・検索と同じ外側ヘッダー内へ共通のHIBILIOブランドを表示する', async () => {
    markAuthenticated();
    const authenticated = render(<MemoryRouter><HomePage service={createService({})} /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(document.querySelectorAll('header.home-page__header > .app-brand-header')).toHaveLength(1);

    authenticated.unmount();
    clearAuthenticated();
    render(<MemoryRouter><HomePage service={createService({})} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(document.querySelectorAll('header.home-page__header > .app-brand-header')).toHaveLength(1);
  });

  it('ログイン済みなら本人のプロフィールアイコン、名前の直後のlevel、改行を含む自己紹介をそのまま上部に表示する', async () => {
    markAuthenticated();
    const bio = '今日の目標を決める。\n無理なく続ける。';
    const getProfile = vi.fn().mockResolvedValue({
      accountIdentifier: 'account-1',
      bio,
      favoriteTags: [],
      headerImageUrl: null,
      iconImageUrl: null,
      initial: '長',
      level: 2,
      name: 'とても長い表示名でもホームのレイアウトを崩さないアカウント',
      socialLinks: [],
      visibility: 'public' as const,
    });

    render(<MemoryRouter><HomePage service={createService({ getProfile })} /></MemoryRouter>);

    expect(await screen.findByText('とても長い表示名でもホームのレイアウトを崩さないアカウント')).toBeInTheDocument();
    expect(screen.getByText('Lv. 2')).toHaveClass('account-profile__level');
    expect(document.querySelector('.home-page__profile-name-row')).toContainElement(screen.getByText('Lv. 2'));
    const displayedBio = document.querySelector('.home-page__profile-bio') as HTMLElement;
    expect(displayedBio).toHaveTextContent(bio, { normalizeWhitespace: false });
    expect(document.querySelector('.home-page__profile-avatar')).toHaveTextContent('長');
    expect(document.querySelector('.home-page__profile-copy')).toContainElement(displayedBio);
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('旧セッションのプロフィールでlevelが未提供なら、既存の名前と自己紹介だけを表示する', async () => {
    markAuthenticated();
    const getProfile = vi.fn().mockResolvedValue({ ...profile, bio: '既存の自己紹介', name: '旧セッションの本人' });

    render(<MemoryRouter><HomePage service={createService({ getProfile })} /></MemoryRouter>);

    expect(await screen.findByText('旧セッションの本人')).toBeInTheDocument();
    expect(screen.queryByText(/Lv\./)).not.toBeInTheDocument();
    expect(screen.getByText('既存の自己紹介')).toHaveClass('home-page__profile-bio');
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it.each([null, ''])('本人の自己紹介が%sならプロフィール内に自己紹介を表示しない', async (bio) => {
    markAuthenticated();
    const getProfile = vi.fn().mockResolvedValue({ ...profile, bio });

    render(<MemoryRouter><HomePage service={createService({ getProfile })} /></MemoryRouter>);

    await screen.findByText('本人');
    expect(document.querySelector('.home-page__profile-bio')).not.toBeInTheDocument();
  });

  it('未ログイン時は本人プロフィールを取得しない', () => {
    clearAuthenticated();
    const getProfile = vi.fn();

    render(<MemoryRouter><HomePage service={createService({ getProfile })} /></MemoryRouter>);

    expect(getProfile).not.toHaveBeenCalled();
  });

  it('プロフィール取得失敗中もいいねと履歴の表示を維持する', async () => {
    markAuthenticated();
    const getProfile = vi.fn().mockRejectedValue(new Error('network failure'));
    const service = createService({
      getProfile,
      listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }),
      listLikesPage: async () => ({ items: [routine], total: 1 }),
    });

    render(<MemoryRouter><HomePage service={service} /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'いいねしたルーティン' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /実行履歴カレンダー/ })).toBeInTheDocument();
    expect(screen.queryByText('network failure')).not.toBeInTheDocument();
  });

  it('プロフィール取得の401では認証状態を失効させログインへ遷移する', async () => {
    markAuthenticated();
    const getProfile = vi.fn().mockRejectedValue(new AccountUnauthorizedError());

    render(<MemoryRouter><HomePage service={createService({ getProfile })} /><LocationProbe /></MemoryRouter>);

    expect(await screen.findByText('/login')).toBeInTheDocument();
  });

  it('アカウント切替後に遅れて返った以前のプロフィールで上書きせず、一覧表示を維持する', async () => {
    markAuthenticated();
    const first = deferred<Awaited<ReturnType<AccountService['getProfile']>>>();
    const second = deferred<Awaited<ReturnType<AccountService['getProfile']>>>();
    const getProfile = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const service = createService({
      getProfile,
      listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }),
      listLikesPage: async () => ({ items: [routine], total: 1 }),
    });

    render(<MemoryRouter><HomePage service={service} /></MemoryRouter>);

    await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
    markAuthenticated();
    await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
    second.resolve({ ...profile, name: '切替後の本人' });
    expect(await screen.findByText('切替後の本人')).toBeInTheDocument();
    first.resolve({ ...profile, name: '切替前の本人' });
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText('切替前の本人')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'いいねしたルーティン' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /実行履歴カレンダー/ })).toBeInTheDocument();
  });

  it('認証世代の切替と同じ描画で旧プロフィール・いいね・履歴を隠し、3 APIを再取得して旧応答を破棄する', async () => {
    markAuthenticated();
    const firstProfile = deferred<Awaited<ReturnType<AccountService['getProfile']>>>();
    const secondProfile = deferred<Awaited<ReturnType<AccountService['getProfile']>>>();
    const firstLikes = deferred<{ items: Routine[]; total: number }>();
    const secondLikes = deferred<{ items: Routine[]; total: number }>();
    const firstHistories = deferred<{ items: AccountExecutionSummary[]; total: number }>();
    const secondHistories = deferred<{ items: AccountExecutionSummary[]; total: number }>();
    const getProfile = vi.fn().mockReturnValueOnce(firstProfile.promise).mockReturnValueOnce(secondProfile.promise);
    const listLikesPage = vi.fn().mockReturnValueOnce(firstLikes.promise).mockReturnValueOnce(secondLikes.promise);
    const listExecutionHistoriesPage = vi.fn().mockReturnValueOnce(firstHistories.promise).mockReturnValueOnce(secondHistories.promise);

    render(<MemoryRouter><HomePage service={createService({ getProfile, listExecutionHistoriesPage, listLikesPage })} /></MemoryRouter>);

    firstProfile.resolve({ ...profile, name: '切替前の本人' });
    firstLikes.resolve({ items: [{ ...routine, title: '切替前のいいね' }], total: 1 });
    firstHistories.resolve({ items: [{ ...execution, postedAt: new Date().toISOString(), routineTitle: '切替前の履歴' }], total: 1 });
    expect(await screen.findByText('切替前の本人')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '切替前のいいね' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^切替前の履歴/ })).toBeInTheDocument();

    act(() => { markAuthenticated(); });

    expect(screen.queryByText('切替前の本人')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '切替前のいいね' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^切替前の履歴/ })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(getProfile).toHaveBeenCalledTimes(2);
      expect(listLikesPage).toHaveBeenCalledTimes(2);
      expect(listExecutionHistoriesPage).toHaveBeenCalledTimes(2);
    });

    secondProfile.resolve({ ...profile, name: '切替後の本人' });
    secondLikes.resolve({ items: [{ ...routine, id: 'post-2', title: '切替後のいいね' }], total: 1 });
    secondHistories.resolve({ items: [{ ...execution, id: 'execution-2', postedAt: new Date().toISOString(), routineTitle: '切替後の履歴' }], total: 1 });
    expect(await screen.findByText('切替後の本人')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '切替後のいいね' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^切替後の履歴/ })).toBeInTheDocument();

    firstProfile.resolve({ ...profile, name: '遅延した切替前の本人' });
    firstLikes.resolve({ items: [{ ...routine, title: '遅延した切替前のいいね' }], total: 1 });
    firstHistories.resolve({ items: [{ ...execution, postedAt: new Date().toISOString(), routineTitle: '遅延した切替前の履歴' }], total: 1 });
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText('遅延した切替前の本人')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '遅延した切替前のいいね' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^遅延した切替前の履歴/ })).not.toBeInTheDocument();
  });

  it('旧認証世代の一覧401は切替後の認証状態を破棄しない', async () => {
    markAuthenticated();
    const firstLikes = deferred<{ items: Routine[]; total: number }>();
    const secondLikes = deferred<{ items: Routine[]; total: number }>();
    const listLikesPage = vi.fn().mockReturnValueOnce(firstLikes.promise).mockReturnValueOnce(secondLikes.promise);

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [], total: 0 }), listLikesPage })} /><LocationProbe /></MemoryRouter>);

    await waitFor(() => expect(listLikesPage).toHaveBeenCalledTimes(1));
    act(() => { markAuthenticated(); });
    await waitFor(() => expect(listLikesPage).toHaveBeenCalledTimes(2));
    secondLikes.resolve({ items: [{ ...routine, title: '切替後のいいね' }], total: 1 });
    expect(await screen.findByRole('heading', { name: '切替後のいいね' })).toBeInTheDocument();
    firstLikes.reject(new AccountUnauthorizedError());
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '切替後のいいね' })).toBeInTheDocument();
  });

  it.each([
    ['いいね', (service: AccountService) => ({ ...service, listLikesPage: async () => { throw new AccountUnauthorizedError(); } })],
    ['実行履歴', (service: AccountService) => ({ ...service, listExecutionHistoriesPage: async () => { throw new AccountUnauthorizedError(); } })],
  ])('現在の認証世代での%s一覧401は認証を破棄してログインへ遷移する', async (_name, withUnauthorizedList) => {
    markAuthenticated();
    const baseService = createService({
      listExecutionHistoriesPage: async () => ({ items: [], total: 0 }),
      listLikesPage: async () => ({ items: [], total: 0 }),
    });

    render(<MemoryRouter><HomePage service={withUnauthorizedList(baseService)} /><LocationProbe /></MemoryRouter>);

    expect(await screen.findByText('/login')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ルーティンを始めよう' })).toBeInTheDocument();
  });

  it('GET /api/my/likes と GET /api/my/routine-executions の結果をAPI返却順のまま表示する', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          account_identifier: '11111111-1111-4111-8111-111111111111', account_name: '投稿者', customization_count: 0, execution_count: 3,
          liked: true, liked_at: '2026-09-04T12:00:00+00:00', post_identifier: 'post-1', post_like_count: 2, post_support_count: 0,
          posted_at: '2026-09-03T12:00:00+00:00', routine_actions: [], routine_execution_minutes: 30,
          routine_identifier: 'routine-1', routine_name: 'いいねしたルーティン', tags: [],
        }], total: 1,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          { executed_action_count: 1, posted_at: '2026-09-02T12:00:00+00:00', routine_execution_identifier: 'execution-old', routine_execution_memo: null, routine_identifier: 'routine-old', routine_name: '古い実行', support_count: 0 },
          { executed_action_count: 2, posted_at: '2026-09-04T12:00:00+00:00', routine_execution_identifier: 'execution-new', routine_execution_memo: '完了', routine_identifier: 'routine-new', routine_name: '新しい実行', support_count: 1 },
        ], total: 2,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify(profileResponse)));
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'いいねしたルーティン' })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.home-page__likes-scroll')).toHaveClass('routine-feed-card-scope'));
    expect(document.querySelector('.home-page__likes-scroll')).not.toHaveClass('routine-feed-page');
    expect(Array.from(document.querySelectorAll('.home-page__calendar-history')).map((element) => element.textContent)).toEqual(['古い実行', '新しい実行']);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/my/likes?page=1&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/my/routine-executions?page=1&number_of_items_per_page=40', { credentials: 'include', method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/my/account', { credentials: 'include', method: 'GET' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it('未ログイン時はログイン導線を表示する', async () => {
    clearAuthenticated();

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'ルーティンを始めよう' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ログイン' })).toHaveAttribute('href', '/login');
  });

  it('空の取得結果と取得失敗時に各一覧の状態を表示する', async () => {
    markAuthenticated();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 })))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(profileResponse)));
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    expect(await screen.findByText('いいねしたルーティンはまだありません')).toBeInTheDocument();
    expect(await screen.findByText('実行履歴を読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument();
  });

  it('Homeの初回いいね取得失敗は再試行で一覧を表示する', async () => {
    markAuthenticated();
    const listLikesPage = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ items: [routine], total: 1 });
    const user = userEvent.setup();

    render(<MemoryRouter><HomePage service={createService({ listLikesPage })} /></MemoryRouter>);

    expect(await screen.findByText('いいねしたルーティンを読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('link', { name: 'いいねしたルーティン' })).toBeInTheDocument();
    expect(listLikesPage).toHaveBeenNthCalledWith(1, 1);
    expect(listLikesPage).toHaveBeenNthCalledWith(2, 1);
  });

  it('Homeの2ページ目履歴取得失敗は表示済みの履歴を保って再試行できる', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    let notifyIntersection: (() => void) | undefined;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }

      disconnect() {}
      observe() {}
      unobserve() {}
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
    });
    const listExecutionHistoriesPage = vi.fn()
      .mockResolvedValueOnce({ items: [execution], total: 2 })
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ items: [{ ...execution, id: 'execution-2', routineTitle: '2ページ目の履歴' }], total: 2 });
    const user = userEvent.setup();

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage })} /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: /^1ページ目の履歴/ })).toBeInTheDocument();
    notifyIntersection?.();
    expect(await screen.findByText('実行履歴を読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1ページ目の履歴/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('button', { name: /^2ページ目の履歴/ })).toBeInTheDocument();
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(1, 1);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(2, 2);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(3, 2);
  });

  it('posted_at を投稿日時としてカレンダーに配置し、キーボードでも月を移動できる', async () => {
    markAuthenticated();
    const user = userEvent.setup();

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }) })} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'がんばった履歴' })).toBeInTheDocument();
    expect(await screen.findByRole('grid', { name: /実行履歴カレンダー/ })).toBeInTheDocument();
    expect(screen.queryByText('投稿日時を基準に表示しています。')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '前の月' }));
    await user.click(screen.getByRole('button', { name: '前の月' }));
    expect(screen.getByRole('button', { name: /^1ページ目の履歴/ })).toBeInTheDocument();
    const nextMonth = screen.getByRole('button', { name: '次の月' });
    const currentCalendarLabel = screen.getByRole('grid', { name: /実行履歴カレンダー/ }).getAttribute('aria-label');
    nextMonth.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('grid', { name: /実行履歴カレンダー/ })).not.toHaveAttribute('aria-label', currentCalendarLabel);
  });

  it('PCで対象月より新しい履歴しかない次ページの後は、対象月に届くまで次ページを続けて取得する', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() }));
    const now = new Date();
    const firstPage = Array.from({ length: 40 }, (_, index) => ({ ...execution, id: `execution-${index + 1}`, postedAt: new Date(now.getFullYear(), now.getMonth(), 1, 12).toISOString(), routineTitle: `履歴${index + 1}` }));
    const secondPage = Array.from({ length: 40 }, (_, index) => ({ ...execution, id: `execution-${index + 41}`, postedAt: new Date(now.getFullYear(), now.getMonth(), 2, 12).toISOString(), routineTitle: `履歴${index + 41}` }));
    const listExecutionHistoriesPage = vi.fn()
      .mockResolvedValueOnce({ items: firstPage, total: 94 })
      .mockResolvedValueOnce({ items: secondPage, total: 94 })
      .mockResolvedValueOnce({ items: Array.from({ length: 14 }, (_, index) => ({ ...execution, id: `execution-${index + 81}`, postedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1, 12).toISOString(), routineTitle: `履歴${index + 81}` })), total: 94 });

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage })} /></MemoryRouter>);

    await screen.findByRole('button', { name: /^履歴1 / });
    const previousMonth = screen.getByRole('button', { name: '前の月' });
    fireEvent.click(previousMonth);
    await waitFor(() => expect(listExecutionHistoriesPage).toHaveBeenCalledTimes(3));
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(2, 2);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(3, 3);
  });

  it('ローカル年月日が今日のセルだけを主色の枠と aria-current=date で示し、過去月へ移動すると示さない', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5, 23, 59, 59));
    markAuthenticated();

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }) })} /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });

    const today = screen.getByText('5', { selector: '.home-page__calendar-day > span' }).parentElement;
    expect(today).not.toBeNull();
    expect(today).toHaveClass('home-page__calendar-day--today');
    expect(today).toHaveAttribute('aria-current', 'date');
    act(() => screen.getByRole('button', { name: '前の月' }).click());
    expect(document.querySelector('.home-page__calendar-day--today')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-current="date"]')).not.toBeInTheDocument();
  });

  it('PCでは現在月より先へ移動できず、今月の未来日を薄いグレーで表示して未来の実行履歴も操作できる', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 15, 12));
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() }));

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [{ ...execution, postedAt: '2026-12-16T12:00:00+09:00', routineTitle: '明日の実行履歴' }], total: 1 }) })} /><LocationProbe /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });

    const today = screen.getByText('15', { selector: '.home-page__calendar-day > span' }).parentElement;
    expect(today).toHaveClass('home-page__calendar-day--today');
    const tomorrow = screen.getByText('16', { selector: '.home-page__calendar-day > span' }).parentElement;
    expect(tomorrow).toHaveClass('home-page__calendar-day--future');
    const nextMonth = screen.getByRole('button', { name: '次の月' });
    expect(nextMonth).toBeDisabled();
    fireEvent.keyDown(nextMonth, { key: 'ArrowRight' });
    expect(screen.getByRole('grid', { name: '実行履歴カレンダー 2026年12月' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '明日の実行履歴 2026年12月16日' }));
    expect(screen.getByText('/routines/routine-1/executions/execution-1')).toBeInTheDocument();
  });

  it('モバイルでも今月の未来日を薄いグレーで表示して未来の実行履歴を操作できる', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 15, 12));
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [{ ...execution, postedAt: '2026-12-16T12:00:00+09:00', routineTitle: '明日の実行履歴' }], total: 1 }) })} /><LocationProbe /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });

    const calendar = screen.getByRole('grid', { name: '実行履歴カレンダー 2026年12月' });
    const tomorrow = within(calendar).getByText('16', { selector: '.home-page__calendar-day > span' }).parentElement;
    expect(tomorrow).toHaveClass('home-page__calendar-day--future');
    fireEvent.click(within(calendar).getByRole('button', { name: '明日の実行履歴 2026年12月16日' }));
    expect(screen.getByText('/routines/routine-1/executions/execution-1')).toBeInTheDocument();
  });

  it('ローカル時刻が深夜をまたぐと、今日の表示を翌日へ更新する', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5, 23, 59, 59));
    markAuthenticated();

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }) })} /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    act(() => vi.advanceTimersByTime(1_000));

    const tomorrow = screen.getByText('6', { selector: '.home-page__calendar-day > span' }).parentElement;
    expect(tomorrow).toHaveClass('home-page__calendar-day--today');
    expect(tomorrow).toHaveAttribute('aria-current', 'date');
  });

  it('posted_at が null の履歴は投稿日時不明の別枠に表示し、詳細へ遷移できる', async () => {
    markAuthenticated();
    const user = userEvent.setup();

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [{ ...execution, postedAt: null, routineTitle: '投稿日時なしの履歴' }], total: 1 }) })} /><LocationProbe /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '投稿日時が不明な履歴' })).toBeInTheDocument();
    expect(screen.getByText('投稿日時がないため、カレンダーには表示できません。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '投稿日時なしの履歴' }));
    expect(screen.getByText('/routines/routine-1/executions/execution-1')).toBeInTheDocument();
  });

  it('モバイルでは現在月を起点に月間カレンダーを縦スクロールし、投稿日時の日付に実行履歴を表示する', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }) })} /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: /^1ページ目の履歴/ })).toBeInTheDocument();
    expect(screen.getAllByRole('grid', { name: /実行履歴カレンダー/ })).not.toHaveLength(0);
    expect(screen.getByRole('region', { name: '実行履歴カレンダー' })).toHaveClass('home-page__mobile-calendar-scroll');
    expect(document.querySelector('.home-page__calendar-list')).not.toBeInTheDocument();
  });

  it('モバイルの月間カレンダーは端へスクロールしても視認中の月を保ち、隣接月だけを追加する', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 15, 12));
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function offsetTop(this: HTMLElement) { return Array.from(this.parentElement?.children ?? []).indexOf(this) * 100; });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }) })} /></MemoryRouter>);

    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: /^1ページ目の履歴/ })).toBeInTheDocument();
    const scrollArea = screen.getByRole('region', { name: '実行履歴カレンダー' });
    const monthsBefore = Array.from(scrollArea.querySelectorAll('.home-page__mobile-calendar-month h3')).map((heading) => heading.textContent);
    expect(monthsBefore.slice(0, 2)).toEqual(['2026年7月', '2026年8月']);

    Object.defineProperties(scrollArea, { clientHeight: { configurable: true, value: 400 }, scrollHeight: { configurable: true, value: 1_200 }, scrollTop: { configurable: true, value: 0, writable: true } });
    fireEvent.scroll(scrollArea);

    await act(async () => { await Promise.resolve(); });
    expect(Array.from(scrollArea.querySelectorAll('.home-page__mobile-calendar-month h3')).map((heading) => heading.textContent).slice(0, 2)).toEqual(['2026年6月', '2026年7月']);
    expect(scrollArea.scrollTop).toBe(100);
  });

  it('モバイルの縦カレンダーは現在月を最終月にして、末尾へスクロールしても未来月を追加しない', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 15, 12));
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }) })} /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });

    const scrollArea = screen.getByRole('region', { name: '実行履歴カレンダー' });
    const monthsBefore = Array.from(scrollArea.querySelectorAll('.home-page__mobile-calendar-month h3')).map((heading) => heading.textContent);
    expect(monthsBefore.at(-1)).toBe('2026年12月');
    Object.defineProperties(scrollArea, { clientHeight: { configurable: true, value: 400 }, scrollHeight: { configurable: true, value: 1_200 }, scrollTop: { configurable: true, value: 800, writable: true } });
    fireEvent.scroll(scrollArea);

    await act(async () => { await Promise.resolve(); });
    expect(Array.from(scrollArea.querySelectorAll('.home-page__mobile-calendar-month h3')).map((heading) => heading.textContent)).toEqual(monthsBefore);
  });

  it('モバイルで過去月の先頭sentinelが継続して見えると、observerの初回通知後に94件を取得する', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback;
        this.isHistoryObserver = options?.root instanceof HTMLElement;
      }

      disconnect() {}
      observe() {
        if (this.isHistoryObserver) queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
      }
      unobserve() {}
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
      private callback: IntersectionObserverCallback;
      private isHistoryObserver: boolean;
    });
    const pageOne = Array.from({ length: 40 }, (_, index) => ({ ...execution, id: `execution-${index + 1}`, postedAt: `2026-${String(11 - Math.floor(index / 4)).padStart(2, '0')}-01T12:00:00+09:00`, routineTitle: `履歴${index + 1}` }));
    const pageTwo = Array.from({ length: 40 }, (_, index) => ({ ...execution, id: `execution-${index + 41}`, postedAt: `2026-${String(1 + Math.floor(index / 4)).padStart(2, '0')}-01T12:00:00+09:00`, routineTitle: `履歴${index + 41}` }));
    const pageThree = Array.from({ length: 14 }, (_, index) => ({ ...execution, id: `execution-${index + 81}`, postedAt: `2025-${String(12 - Math.floor(index / 2)).padStart(2, '0')}-01T12:00:00+09:00`, routineTitle: `履歴${index + 81}` }));
    const listExecutionHistoriesPage = vi.fn()
      .mockResolvedValueOnce({ items: pageOne, total: 94 })
      .mockResolvedValueOnce({ items: pageTwo, total: 94 })
      .mockResolvedValueOnce({ items: pageThree, total: 94 });

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage })} /></MemoryRouter>);

    await screen.findByRole('button', { name: /^履歴1 / });
    const scrollArea = screen.getByRole('region', { name: '実行履歴カレンダー' });
    expect(scrollArea.firstElementChild).toHaveAttribute('aria-label', 'さらに読み込む');
    await waitFor(() => expect(listExecutionHistoriesPage).toHaveBeenCalledTimes(3));
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(1, 1);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(2, 2);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(3, 3);
  });

  it('モバイルの先頭sentinelが交差していない間は残りの履歴を自動取得しない', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback;
        this.isHistoryObserver = options?.root instanceof HTMLElement;
      }

      disconnect() {}
      observe() {
        if (this.isHistoryObserver) queueMicrotask(() => this.callback([{ isIntersecting: false } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
      }
      unobserve() {}
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
      private callback: IntersectionObserverCallback;
      private isHistoryObserver: boolean;
    });
    const listExecutionHistoriesPage = vi.fn().mockResolvedValue({ items: [execution], total: 94 });

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage })} /></MemoryRouter>);

    await screen.findByRole('button', { name: /^1ページ目の履歴/ });
    await act(async () => { await Promise.resolve(); });
    expect(listExecutionHistoriesPage).toHaveBeenCalledTimes(1);
  });

  it('モバイルの縦カレンダーは年をまたぐ深夜にローカルの新しい現在月を最終月として追加する', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [execution], total: 1 }) })} /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    act(() => vi.advanceTimersByTime(1_000));

    const scrollArea = screen.getByRole('region', { name: '実行履歴カレンダー' });
    expect(Array.from(scrollArea.querySelectorAll('.home-page__mobile-calendar-month h3')).at(-1)).toHaveTextContent('2027年1月');
  });

  it('カレンダーは行ごとに7日分のセルを持ち、同名の履歴を日付付きの名前で区別する', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 3, 12));
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() }));
    const sameTitleOnAnotherDay = { ...execution, id: 'execution-2', postedAt: '2026-09-04T12:00:00+00:00', routineTitle: '同名の履歴' };

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage: async () => ({ items: [{ ...execution, routineTitle: '同名の履歴' }, sameTitleOnAnotherDay], total: 2 }) })} /></MemoryRouter>);

    await act(async () => { await Promise.resolve(); });
    const calendar = screen.getByRole('grid', { name: '実行履歴カレンダー 2026年9月' });
    const rows = within(calendar).getAllByRole('row');
    expect(rows).toHaveLength(6);
    rows.slice(1).forEach((row) => expect(within(row).getAllByRole('gridcell')).toHaveLength(7));
    expect(screen.getByRole('button', { name: '同名の履歴 2026年9月3日' })).toBeInTheDocument();
    const futureHistory = screen.getByRole('button', { name: '同名の履歴 2026年9月4日' });
    expect(futureHistory).toBeInTheDocument();
    expect(futureHistory.parentElement).toHaveClass('home-page__calendar-day--future');
  });

  it('モバイルの継続intersectionは取得エラーでループせず、再試行成功後に残りを取得する', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback;
        this.isHistoryObserver = options?.root instanceof HTMLElement;
      }

      disconnect() {}
      observe() {
        if (this.isHistoryObserver) queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
      }
      unobserve() {}
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
      private callback: IntersectionObserverCallback;
      private isHistoryObserver: boolean;
    });
    const pageOne = Array.from({ length: 40 }, (_, index) => ({ ...execution, id: `execution-${index + 1}`, routineTitle: `履歴${index + 1}` }));
    const pageTwo = Array.from({ length: 40 }, (_, index) => ({ ...execution, id: `execution-${index + 41}`, routineTitle: `履歴${index + 41}` }));
    const pageThree = [{ ...execution, id: 'execution-81', routineTitle: '履歴81' }];
    const listExecutionHistoriesPage = vi.fn()
      .mockResolvedValueOnce({ items: pageOne, total: 81 })
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ items: pageTwo, total: 81 })
      .mockResolvedValueOnce({ items: pageThree, total: 81 });
    const user = userEvent.setup();

    render(<MemoryRouter><HomePage service={createService({ listExecutionHistoriesPage })} /></MemoryRouter>);

    await screen.findByRole('button', { name: /^履歴1 / });
    const scrollArea = screen.getByRole('region', { name: '実行履歴カレンダー' });
    expect(scrollArea.querySelector(':scope > [aria-label="さらに読み込む"]')).not.toBeNull();
    expect(scrollArea.firstElementChild).toHaveAttribute('aria-label', 'さらに読み込む');
    expect(await screen.findByText('実行履歴を読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    expect(listExecutionHistoriesPage).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('button', { name: '履歴80 2026年9月3日' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '履歴81 2026年9月3日' })).toBeInTheDocument();
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(1, 1);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(2, 2);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(3, 2);
    expect(listExecutionHistoriesPage).toHaveBeenNthCalledWith(4, 3);
  });

  it('横スワイプで末尾に達したいいね一覧は次ページを追加する', async () => {
    const intersectionNotifiers: Array<() => void> = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        intersectionNotifiers.push(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
      }

      disconnect() {}
      observe() {}
      unobserve() {}
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
    });
    markAuthenticated();
    const listLikesPage = vi.fn()
      .mockResolvedValueOnce({ items: [routine], total: 2 })
      .mockResolvedValueOnce({ items: [{ ...routine, id: 'post-2', routineId: 'routine-2', title: '2ページ目のいいね' }], total: 2 });

    render(<MemoryRouter><HomePage service={createService({ listLikesPage })} /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'いいねしたルーティン' });
    intersectionNotifiers.forEach((notify) => notify());
    expect(await screen.findByRole('heading', { name: '2ページ目のいいね' })).toBeInTheDocument();
    intersectionNotifiers.forEach((notify) => notify());
    await waitFor(() => expect(listLikesPage).toHaveBeenCalledTimes(2));
    expect(listLikesPage).toHaveBeenNthCalledWith(1, 1);
    expect(listLikesPage).toHaveBeenNthCalledWith(2, 2);
  });

  it('いいね済みのルーティンを取り消し、件数と表示状態を更新する', async () => {
    markAuthenticated();
    const user = userEvent.setup();
    const likeService = { create: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };

    render(<MemoryRouter><HomePage likeService={likeService} service={createService({ listLikesPage: async () => ({ items: [routine], total: 1 }) })} /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'いいねしたルーティン' });
    await user.click(screen.getByRole('button', { name: 'いいねを取り消す' }));
    expect(likeService.remove).toHaveBeenCalledWith('post-1');
    expect(screen.getByRole('button', { name: 'いいねする' })).toHaveTextContent('1');
  });

  it('いいねしたルーティンは詳細へ遷移できるがHomeからは実行できず、履歴から実行詳細を開ける', async () => {
    markAuthenticated();
    vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() }));
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ account_identifier: '11111111-1111-4111-8111-111111111111', account_name: '投稿者', customization_count: 0, execution_count: 0, liked: true, liked_at: '2026-09-04T12:00:00+00:00', post_identifier: 'post-1', post_like_count: 0, post_support_count: 0, posted_at: '2026-09-03T12:00:00+00:00', routine_actions: [], routine_execution_minutes: 30, routine_identifier: 'routine-1', routine_name: '実行するルーティン', tags: [] }], total: 1,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ executed_action_count: 1, posted_at: '2026-09-04T12:00:00+00:00', routine_execution_identifier: 'execution-1', routine_execution_memo: null, routine_identifier: 'routine-1', routine_name: '確認する履歴', support_count: 0 }], total: 1,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify(profileResponse))));

    render(<MemoryRouter><HomePage /><LocationProbe /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: '実行するルーティン' })).toHaveAttribute('href', '/routines/routine-1');
    expect(screen.queryByRole('link', { name: '実行する' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^確認する履歴/ }));
    expect(screen.getByText('/routines/routine-1/executions/execution-1')).toBeInTheDocument();
  });
});

function LocationProbe() {
  return <output>{useLocation().pathname}</output>;
}

const routine: Routine = {
  accountId: 'account-1',
  authorName: '投稿者',
  createdAt: '2026-09-03T12:00:00+00:00',
  customizations: 0,
  durationMinutes: 30,
  executions: 0,
  id: 'post-1',
  liked: true,
  likes: 2,
  routineId: 'routine-1',
  steps: [],
  supports: 0,
  tags: [],
  title: 'いいねしたルーティン',
};

const execution: AccountExecutionSummary = {
  executedActionCount: 1,
  id: 'execution-1',
  memo: null,
  postedAt: '2026-09-03T12:00:00+00:00',
  routineId: 'routine-1',
  routineTitle: '1ページ目の履歴',
  supportCount: 0,
};

const profileResponse = {
  account_bio: null,
  account_identifier: 'account-1',
  account_name: '本人',
  favorite_tags: [],
  header_image_url: null,
  icon_image_url: null,
  social_links: [],
  visibility: 'public',
};

const profile = {
  accountIdentifier: 'account-1',
  bio: null,
  favoriteTags: [],
  headerImageUrl: null,
  iconImageUrl: null,
  initial: '本',
  name: '本人',
  socialLinks: [],
  visibility: 'public' as const,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function createService(overrides: Partial<AccountService>): AccountService {
  return {
    getExecutionHistory: async () => null,
    getProfile: async () => null,
    listBlockedAccounts: async () => [],
    listExecutionHistories: async () => [],
    listLikes: async () => [],
    listPosts: async () => [],
    listReceivedFollowRequests: async () => [],
    listRoutines: async () => [],
    listSentFollowRequests: async () => [],
    ...overrides,
  };
}
