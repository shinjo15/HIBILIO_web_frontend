import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineExecutionPage } from './RoutineExecutionPage';
import type { RoutineExecutionService } from '../services/routineExecutionService';

const routine = {
  id: 'routine-1',
  steps: [
    { action: '水を飲む', time: '07:00' },
    { action: 'ストレッチ', duration: '10分', time: '07:05' },
  ],
  title: 'テストルーティン',
};

afterEach(() => cleanup());

function renderPage(service: RoutineExecutionService, initialPath = '/routines/routine-1/execute') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RoutineExecutionPage service={service} />} path="/routines/:routineId/execute" />
        <Route element={<DetailStub />} path="/routines/:routineId" />
        <Route element={<p>ホーム</p>} path="/" />
      </Routes>
    </MemoryRouter>,
  );
}

function DetailStub() {
  return <Link to="/routines/routine-1/execute">詳細</Link>;
}

describe('RoutineExecutionPage', () => {
  it('開始、ステップ切り替え、進捗、コメント、完了結果を操作できる', async () => {
    const user = userEvent.setup();
    const complete = vi.fn().mockImplementation(async (input) => input);
    renderPage({ complete, get: vi.fn().mockResolvedValue(routine) });

    expect(await screen.findByRole('button', { name: '実行を開始する' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /水を飲む/ }));
    expect(screen.getByRole('button', { name: '終了する' })).toBeInTheDocument();
    expect(screen.getByText('1/2 完了')).toBeInTheDocument();

    await user.type(screen.getByLabelText('ひとこと（任意）'), '今日も完了');
    await user.click(screen.getByRole('button', { name: '終了する' }));

    expect(await screen.findByText('お疲れ様でした！')).toBeInTheDocument();
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({
      achieved: 1,
      comment: '今日も完了',
      routineId: 'routine-1',
      total: 2,
    }));
    expect(screen.getByText('達成').parentElement).toHaveTextContent('1 / 2');
    expect(screen.getByText('今日も完了', { exact: false })).toBeInTheDocument();
  });

  it('戻ると未送信状態を破棄し、再入場時に ready に戻る', async () => {
    const user = userEvent.setup();
    const complete = vi.fn().mockResolvedValue(undefined);
    renderPage({ complete, get: vi.fn().mockResolvedValue(routine) });

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.click(screen.getByRole('button', { name: 'ルーティン詳細へ戻る' }));
    expect(screen.getByRole('link', { name: '詳細' })).toBeInTheDocument();
    expect(screen.queryByText('戻ると未送信の進捗は破棄されます。')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '詳細' }));
    expect(await screen.findByRole('button', { name: '実行を開始する' })).toBeInTheDocument();
    expect(screen.queryByLabelText('ひとこと（任意）')).not.toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  });

  it('存在しないルーティンの状態を表示する', async () => {
    renderPage({ complete: vi.fn(), get: vi.fn().mockResolvedValue(null) }, '/routines/missing/execute');

    expect(await screen.findByText('実行するルーティンが見つかりませんでした。')).toBeInTheDocument();
  });
});
