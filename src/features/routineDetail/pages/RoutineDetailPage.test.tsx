import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineDetailPage } from './RoutineDetailPage';
import { createRoutineDetailService, type RoutineDetailService } from '../services/routineDetailService';

const detail = {
  author: { accountId: '10000000-0000-4000-8000-000000000002', handle: 'routine-owner', iconImageUrl: 'https://example.com/icons/owner.webp', name: 'ルーティン作者' },
  customizations: 2,
  customizationsList: [],
  description: 'ルーティンの詳しい説明です。',
  durationMinutes: 30,
  executions: 12,
  executionPosts: [
    {
      achieved: 1,
      avatar: 'R',
      cheers: 3,
      comment: '続けられました',
      date: '今日',
      id: 'execution-1',
      iconImageUrl: 'https://example.com/icons/executor.webp',
      minutes: 25,
      routineId: 'routine-1',
      total: 2,
      userHandle: 'runner',
      userName: '実行した人',
    },
  ],
  id: 'routine-1',
  liked: false,
  likes: 4,
  steps: [
    { action: '開始', memo: '開始前に深呼吸します。', time: '07:00' },
    { action: '終了', duration: '10分', time: '07:20' },
  ],
  tags: ['習慣'],
  title: 'テストルーティン',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPage(service: RoutineDetailService, path = '/routines/routine-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RoutineDetailPage service={service} />} path="/routines/:routineId" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoutineDetailPage', () => {
  it('概要・ステップの開閉と、いいね・応援の画面内操作を提供する', async () => {
    const user = userEvent.setup();
    const service = createRoutineDetailService({ get: async () => detail });

    renderPage(service);

    expect(await screen.findByRole('heading', { name: 'テストルーティン' })).toBeInTheDocument();
    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.com/icons/owner.webp');
    expect(screen.getByRole('link', { name: 'ルーティン作者' })).toHaveAttribute('href', '/accounts/10000000-0000-4000-8000-000000000002');
    expect(screen.getByRole('link', { name: 'ルーティン作者' })).toHaveClass('routine-detail-author__link');
    expect(screen.queryByText('ルーティンの詳しい説明です。')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '概要' }));
    expect(screen.getByText('ルーティンの詳しい説明です。')).toBeInTheDocument();

    const stepsToggle = screen.getByRole('button', { name: /ルーティン内容/ });
    await user.click(stepsToggle);
    expect(screen.queryByText('開始')).not.toBeInTheDocument();
    await user.click(stepsToggle);
    expect(screen.getByText('開始')).toBeInTheDocument();
    expect(screen.queryByText('開始前に深呼吸します。')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'メモ' }));
    expect(screen.getByText('開始前に深呼吸します。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'いいね' }));
    expect(screen.getByRole('button', { name: 'いいねを取り消す' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '応援する 実行した人' }));
    expect(screen.getByRole('button', { name: '応援済み 実行した人' })).toBeInTheDocument();
  });

  it('実行投稿とカスタマイズのタブを切り替え、空状態を表示する', async () => {
    const user = userEvent.setup();
    const service = createRoutineDetailService({
      get: async () => ({ ...detail, executionPosts: [], customizationsList: [] }),
    });

    renderPage(service);

    await screen.findByRole('heading', { name: 'テストルーティン' });
    expect(screen.getByText('まだ実行投稿はありません')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'カスタマイズ' }));
    expect(screen.getByText('まだカスタマイズはありません')).toBeInTheDocument();
  });

  it('実行投稿とカスタマイズをそれぞれ末尾へ追加し、total到達後は取得しない', async () => {
    const user = userEvent.setup();
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
    const notifyIntersection = () => intersectionNotifiers.forEach((notify) => notify());
    const executionPost = { achieved: 2, avatar: 'A', cheers: 1, date: '昨日', id: 'execution-2', minutes: 20, total: 2, userHandle: 'another', userName: '別の実行者' };
    const customization = { authorName: '別の作者', description: 'もう一つの版です。', id: 'customization-2', title: 'もう一つの版' };
    const listExecutionPostsPage = vi.fn().mockResolvedValue({ items: [executionPost], total: 2 });
    const listCustomizationsPage = vi.fn().mockResolvedValue({ items: [customization], total: 2 });
    const service = createRoutineDetailService({
      get: async () => ({ ...detail, customizationsList: [{ authorName: '最初の作者', description: '最初の版です。', id: 'customization-1', routineId: 'routine-1', title: '最初の版' }], customizationsTotal: 2, executionPostsTotal: 2 }),
      listCustomizations: async () => ({ items: [], total: 0 }),
      listExecutionPosts: async () => ({ items: [], total: 0 }),
    });
    const pagedService = { ...service, listExecutionPostsPage, listCustomizationsPage };
    renderPage(pagedService);

    await screen.findByRole('heading', { name: 'テストルーティン' });
    await screen.findByLabelText('さらに読み込む');
    notifyIntersection();
    expect(await screen.findByText(/別の実行者/)).toBeInTheDocument();
    notifyIntersection();
    await waitFor(() => expect(listExecutionPostsPage).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('tab', { name: 'カスタマイズ' }));
    expect(screen.getByText(/最初の作者/)).toBeInTheDocument();
    await screen.findByLabelText('さらに読み込む');
    notifyIntersection();
    expect(await screen.findByText(/別の作者/)).toBeInTheDocument();
    notifyIntersection();
    await waitFor(() => expect(listCustomizationsPage).toHaveBeenCalledTimes(1));
    expect(listExecutionPostsPage).toHaveBeenCalledWith('routine-1', 2, 2);
    expect(listCustomizationsPage).toHaveBeenCalledWith('routine-1', 2);
  });

  it('カスタマイズ一覧を表示し、各ルーティンの詳細へ遷移できる', async () => {
    const user = userEvent.setup();
    const service = createRoutineDetailService({
      get: async () => ({
        ...detail,
        customizationsList: [{
          authorName: 'カスタマイズした人',
          description: '短縮したバージョンです。',
          id: 'customized-routine',
          routineId: 'routine-1',
          title: '短縮版',
        }],
      }),
    });

    renderPage(service);

    await screen.findByRole('heading', { name: 'テストルーティン' });
    await user.click(screen.getByRole('tab', { name: 'カスタマイズ' }));
    expect(screen.getByText('カスタマイズ版 — カスタマイズした人')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '短縮版' })).toHaveAttribute('href', '/routines/customized-routine');
  });

  it('次ページ取得エラー時も実行投稿を保持し、再試行できる', async () => {
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
    const notifyIntersection = () => intersectionNotifiers.forEach((notify) => notify());
    const executionPost = { achieved: 2, avatar: 'A', cheers: 1, date: '昨日', id: 'execution-2', minutes: 20, total: 2, userHandle: 'another', userName: '別の実行者' };
    const listExecutionPostsPage = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ items: [executionPost], total: 2 });
    const service: RoutineDetailService = {
      ...createRoutineDetailService({ get: async () => ({ ...detail, executionPostsTotal: 2 }) }),
      listExecutionPostsPage,
    };
    renderPage(service);

    await screen.findByRole('heading', { name: 'テストルーティン' });
    await screen.findByLabelText('さらに読み込む');
    notifyIntersection();
    expect(await screen.findByText(/ルーティン詳細を読み込めませんでした。時間をおいて再試行してください。/)).toBeInTheDocument();
    expect(screen.getByText('実行した人')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByText(/別の実行者/)).toBeInTheDocument();
    expect(listExecutionPostsPage).toHaveBeenCalledTimes(2);
  });

  it('一覧へ戻るリンクと、存在しないルーティンの空状態を表示する', async () => {
    const service: RoutineDetailService = createRoutineDetailService({ get: async () => null });

    renderPage(service, '/routines/missing');

    expect(await screen.findByText('ルーティンが見つかりませんでした。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '一覧へ戻る' })).toHaveAttribute('href', '/');
  });

  it('実行する操作から実行画面の URL へ遷移する', async () => {
    const user = userEvent.setup();
    const service = createRoutineDetailService({ get: async () => detail });
    render(
      <MemoryRouter initialEntries={['/routines/routine-1']}>
        <Routes>
          <Route element={<RoutineDetailPage service={service} />} path="/routines/:routineId" />
          <Route element={<p>実行画面</p>} path="/routines/:routineId/execute" />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'テストルーティン' });
    await user.click(screen.getByRole('button', { name: '実行する' }));
    expect(screen.getByText('実行画面')).toBeInTheDocument();
  });

  it('カスタマイズ操作からカスタマイズ作成画面の URL へ遷移する', async () => {
    const user = userEvent.setup();
    const service = createRoutineDetailService({ get: async () => detail });
    render(
      <MemoryRouter initialEntries={['/routines/routine-1']}>
        <Routes>
          <Route element={<RoutineDetailPage service={service} />} path="/routines/:routineId" />
          <Route element={<p>カスタマイズ画面</p>} path="/routines/:routineId/customize" />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'テストルーティン' });
    await user.click(screen.getByRole('button', { name: 'カスタマイズ' }));
    expect(screen.getByText('カスタマイズ画面')).toBeInTheDocument();
  });
});
