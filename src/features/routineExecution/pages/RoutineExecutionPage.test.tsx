import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineExecutionPage } from './RoutineExecutionPage';
import { RoutineExecutionError, type RoutineExecutionService } from '../services/routineExecutionService';
import { isAuthenticated, markAuthenticated } from '../../auth/services/authSession';

const routine = {
  id: '30000000-0000-4000-8000-000000000001',
  steps: [
    { action: '水を飲む', id: '40000000-0000-4000-8000-000000000001' },
    { action: 'ストレッチ', duration: '10分', id: '40000000-0000-4000-8000-000000000002' },
  ],
  title: 'テストルーティン',
};

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

function renderPage(service: RoutineExecutionService, initialPath = '/routines/routine-1/execute') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RoutineExecutionPage service={service} />} path="/routines/:routineId/execute" />
        <Route element={<DetailStub />} path="/routines/:routineId" />
        <Route element={<p>ホーム</p>} path="/" />
        <Route element={<p>ログイン</p>} path="/login" />
      </Routes>
    </MemoryRouter>,
  );
}

function DetailStub() {
  return <Link to="/routines/routine-1/execute">詳細</Link>;
}

describe('RoutineExecutionPage', () => {
  it('実施済みActionが0件の間は投稿できず、1件選択すると投稿できる', async () => {
    const user = userEvent.setup();
    renderPage({ create: vi.fn(), get: vi.fn().mockResolvedValue(routine) });

    const submitButton = await screen.findByRole('button', { name: '実行結果を投稿する' });
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /水を飲む/ }));
    expect(submitButton).toBeEnabled();
  });

  it('実施済みActionと任意メモを送信し、成功表示へ切り替える', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    renderPage({ create, get: vi.fn().mockResolvedValue(routine) });

    expect(await screen.findByRole('button', { name: '実行結果を投稿する' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '実行をキャンセルする' }).querySelector('svg')).toHaveAttribute('stroke', 'currentColor');

    await user.click(screen.getByRole('button', { name: /水を飲む/ }));
    expect(screen.getByText('1/2 完了')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /水を飲む/ })).toHaveClass('routine-execution-step--checked');
    expect(screen.getByRole('button', { name: /水を飲む/ }).querySelector('polyline')).toHaveAttribute('stroke', 'currentColor');

    await user.type(screen.getByLabelText('ひとこと（任意）'), '今日も完了');
    await user.click(screen.getByRole('button', { name: '実行結果を投稿する' }));

    expect(await screen.findByText('お疲れ様でした！')).toBeInTheDocument();
    expect(screen.getByText('実行結果を投稿しました。')).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith({
      executedRoutineActionIdentifiers: ['40000000-0000-4000-8000-000000000001'],
      memo: '今日も完了',
      routineIdentifier: routine.id,
    });
  });

  it('入力値エラーを表示し、修正時に消去する', async () => {
    const user = userEvent.setup();
    const create = vi.fn();
    renderPage({ create, get: vi.fn().mockResolvedValue(routine) });

    await user.type(await screen.findByLabelText('ひとこと（任意）'), 'あ'.repeat(32));
    await user.click(screen.getByRole('button', { name: /水を飲む/ }));
    await user.click(screen.getByRole('button', { name: '実行結果を投稿する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ひとことは31文字以内で入力してください。');
    expect(create).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('ひとこと（任意）'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('通信エラーを表示し、再送信できる', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(undefined);
    renderPage({ create, get: vi.fn().mockResolvedValue(routine) });

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.click(await screen.findByRole('button', { name: '実行結果を投稿する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('実行画面を表示できませんでした。時間をおいて再試行してください。');
    await user.click(screen.getByRole('button', { name: '実行結果を投稿する' }));
    expect(await screen.findByText('お疲れ様でした！')).toBeInTheDocument();
  });

  it('401のときは認証状態を破棄してログイン画面へ遷移する', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    const create = vi.fn().mockRejectedValue(new RoutineExecutionError('unauthorized', 401));
    renderPage({ create, get: vi.fn().mockResolvedValue(routine) });

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.click(await screen.findByRole('button', { name: '実行結果を投稿する' }));

    expect(await screen.findByText('ログイン')).toBeInTheDocument();
    expect(isAuthenticated()).toBe(false);
  });

  it('存在しないルーティンの状態を表示する', async () => {
    renderPage({ create: vi.fn(), get: vi.fn().mockResolvedValue(null) }, '/routines/missing/execute');

    expect(await screen.findByText('実行するルーティンが見つかりませんでした。')).toBeInTheDocument();
  });
});
