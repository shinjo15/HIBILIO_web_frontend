import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { RoutineDetailPage } from './RoutineDetailPage';
import { createRoutineDetailService, type RoutineDetailService } from '../services/routineDetailService';

const detail = {
  author: { handle: 'routine-owner', name: 'ルーティン作者' },
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
    { action: '開始', time: '07:00' },
    { action: '終了', duration: '10分', time: '07:20' },
  ],
  tags: ['習慣'],
  title: 'テストルーティン',
};

afterEach(() => cleanup());

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
    expect(screen.queryByText('ルーティンの詳しい説明です。')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '概要' }));
    expect(screen.getByText('ルーティンの詳しい説明です。')).toBeInTheDocument();

    const stepsToggle = screen.getByRole('button', { name: /ルーティン内容/ });
    await user.click(stepsToggle);
    expect(screen.queryByText('開始')).not.toBeInTheDocument();
    await user.click(stepsToggle);
    expect(screen.getByText('開始')).toBeInTheDocument();

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
});
