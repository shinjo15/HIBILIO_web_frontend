import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineExecutionPage } from './RoutineExecutionPage';
import { RoutineExecutionError, type RoutineExecutionService } from '../services/routineExecutionService';
import { isAuthenticated, markAuthenticated, resetAuthenticationForTesting } from '../../auth/services/authSession';

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
  resetAuthenticationForTesting();
  window.sessionStorage.clear();
});

function service(overrides: Partial<RoutineExecutionService> = {}): RoutineExecutionService {
  return {
    complete: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getDraft: vi.fn().mockResolvedValue({ executedRoutineActionIdentifiers: [], memo: '' }),
    get: vi.fn().mockResolvedValue(routine),
    start: vi.fn().mockResolvedValue({ executedRoutineActionIdentifiers: [], memo: '' }),
    updateAction: vi.fn().mockResolvedValue(undefined),
    updateMemo: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPage(executionService: RoutineExecutionService, initialPath = '/routines/30000000-0000-4000-8000-000000000001/execute') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RoutineExecutionPage service={executionService} />} path="/routines/:routineId/execute" />
        <Route element={<DetailStub />} path="/routines/:routineId" />
        <Route element={<p>実行履歴</p>} path="/account" />
        <Route element={<p>ホーム</p>} path="/" />
        <Route element={<p>ログイン</p>} path="/login" />
      </Routes>
    </MemoryRouter>,
  );
}

function DetailStub() {
  return <Link to="/routines/30000000-0000-4000-8000-000000000001/execute">詳細</Link>;
}

function RouteSwitchingPage({ service: executionService }: { service: RoutineExecutionService }) {
  const navigate = useNavigate();

  return <><button onClick={() => navigate('/routines/30000000-0000-4000-8000-000000000002/execute')} type="button">別のルーティンへ移動</button><RoutineExecutionPage service={executionService} /></>;
}

describe('RoutineExecutionPage', () => {
  it('未チェックでも実行を保留して詳細へ戻り、完了・削除を送信しない', async () => {
    const user = userEvent.setup();
    const complete = vi.fn().mockResolvedValue(undefined);
    const deleteDraft = vi.fn().mockResolvedValue(undefined);
    renderPage(service({ complete, delete: deleteDraft }));

    const pauseButton = await screen.findByRole('button', { name: '実行を保留する' });
    const submitButton = screen.getByRole('button', { name: '実行結果を投稿する' });

    expect(pauseButton).toBeEnabled();
    expect(submitButton).toBeDisabled();
    expect(pauseButton.compareDocumentPosition(submitButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(pauseButton);

    expect(await screen.findByRole('link', { name: '詳細' })).toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
    expect(deleteDraft).not.toHaveBeenCalled();
  });

  it('実施済みアクションが0件の間は完了できない', async () => {
    renderPage(service());

    expect(await screen.findByRole('button', { name: '実行結果を投稿する' })).toBeDisabled();
  });

  it('開始時に既存ドラフトのチェックと一言を再開する', async () => {
    const executionService = service({ start: vi.fn().mockResolvedValue({
      executedRoutineActionIdentifiers: [routine.steps[0].id], memo: '続きから',
    }) });
    renderPage(executionService);

    expect(await screen.findByText('1/2 完了')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /水を飲む/ })).toHaveClass('routine-execution-step--checked');
    expect(screen.getByLabelText('ひとこと（任意）')).toHaveValue('続きから');
  });

  it('読込開始に失敗したときは再試行で同じドラフトを開く', async () => {
    const user = userEvent.setup();
    const start = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ executedRoutineActionIdentifiers: [], memo: '' });
    renderPage(service({ start }));

    expect(await screen.findByText('実行画面を表示できませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '再試行する' }));
    expect(await screen.findByRole('button', { name: /水を飲む/ })).toBeInTheDocument();
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('一言はbackend制約と同じUnicode code point 31文字までしか入力できない', async () => {
    const user = userEvent.setup();
    const updateMemo = vi.fn().mockResolvedValue(undefined);
    renderPage(service({ updateMemo }));

    const memo = await screen.findByLabelText('ひとこと（任意）');
    await user.type(memo, '😀'.repeat(32));

    expect(memo).toHaveValue('😀'.repeat(31));
    expect(updateMemo).toHaveBeenLastCalledWith(routine.id, '😀'.repeat(31));
  });

  it('アクション変更と一言を保存してからドラフトを完了する', async () => {
    const user = userEvent.setup();
    const updateAction = vi.fn().mockResolvedValue(undefined);
    const updateMemo = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn().mockResolvedValue(undefined);
    renderPage(service({ complete, updateAction, updateMemo }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.type(screen.getByLabelText('ひとこと（任意）'), '今日も完了');
    await user.click(screen.getByRole('button', { name: '実行結果を投稿する' }));

    await screen.findByText('お疲れ様でした！');
    expect(updateAction).toHaveBeenCalledWith(routine.id, routine.steps[0].id, true);
    expect(updateMemo).toHaveBeenLastCalledWith(routine.id, '今日も完了');
    expect(complete).toHaveBeenCalledWith(routine.id);
  });

  it('保存失敗を表示し、再試行する', async () => {
    const user = userEvent.setup();
    const updateAction = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(undefined);
    renderPage(service({ updateAction }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('実行画面を表示できませんでした。時間をおいて再試行してください。');
    await user.click(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => expect(updateAction).toHaveBeenCalledTimes(2));
  });

  it('先行保存に失敗しても未保存の一言を保持し、明示的な再試行で保存する', async () => {
    const user = userEvent.setup();
    let rejectFirst: ((reason?: unknown) => void) | undefined;
    const updateAction = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectFirst = reject; }))
      .mockResolvedValueOnce(undefined);
    const updateMemo = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn().mockResolvedValue(undefined);
    const getDraft = vi.fn().mockResolvedValue({ executedRoutineActionIdentifiers: [], memo: '' });
    renderPage(service({ complete, getDraft, updateAction, updateMemo }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.type(screen.getByLabelText('ひとこと（任意）'), '競合入力');
    await user.click(screen.getByRole('button', { name: '実行結果を投稿する' }));
    rejectFirst?.(new Error('network error'));

    expect(await screen.findByRole('alert')).toHaveTextContent('実行画面を表示できませんでした。時間をおいて再試行してください。');
    expect(updateAction).toHaveBeenCalledTimes(1);
    expect(updateMemo).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(getDraft).toHaveBeenCalledWith(routine.id);
    expect(screen.getByLabelText('ひとこと（任意）')).toHaveValue('競合入力');
    expect(screen.getByRole('button', { name: '実行結果を投稿する' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '再試行する' }));
    await waitFor(() => expect(updateAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(updateMemo).toHaveBeenCalledWith(routine.id, '競合入力'));
  });

  it('連続したアクション変更を保存順に直列化する', async () => {
    const user = userEvent.setup();
    let resolveFirst: (() => void) | undefined;
    const updateAction = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(undefined);
    renderPage(service({ updateAction }));

    const action = await screen.findByRole('button', { name: /水を飲む/ });
    await user.click(action);
    await user.click(action);

    expect(updateAction).toHaveBeenCalledTimes(1);
    expect(updateAction).toHaveBeenCalledWith(routine.id, routine.steps[0].id, true);
    resolveFirst?.();
    await waitFor(() => expect(updateAction).toHaveBeenCalledWith(routine.id, routine.steps[0].id, false));
  });

  it('ルーティンIDを変更したら旧画面の保存待ちを新しい画面のキューへ持ち込まない', async () => {
    const user = userEvent.setup();
    let resolveFirst: (() => void) | undefined;
    const secondRoutine = { ...routine, id: '30000000-0000-4000-8000-000000000002', title: '別のルーティン' };
    const updateAction = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirst = resolve; })).mockResolvedValueOnce(undefined);
    const executionService = service({
      get: vi.fn().mockImplementation(async (id: string) => id === routine.id ? routine : secondRoutine),
      updateAction,
    });
    render(<MemoryRouter initialEntries={['/routines/30000000-0000-4000-8000-000000000001/execute']}><Routes><Route element={<RouteSwitchingPage service={executionService} />} path="/routines/:routineId/execute" /></Routes></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await waitFor(() => expect(updateAction).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: '別のルーティンへ移動' }));
    await screen.findByText('別のルーティン');
    await user.click(screen.getByRole('button', { name: /水を飲む/ }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledWith(secondRoutine.id, routine.steps[0].id, true));
    resolveFirst?.();
  });

  it('外部端末で完了後に更新が404なら再取得し、存在しないドラフトを上書きしない', async () => {
    const user = userEvent.setup();
    const updateAction = vi.fn().mockRejectedValue(new RoutineExecutionError('missing', 404));
    const getDraft = vi.fn().mockResolvedValue(null);
    renderPage(service({ getDraft, updateAction }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('完了済みの可能性があります。履歴を確認してください。');
    await user.click(screen.getByRole('button', { name: /ストレッチ/ }));
    await user.type(screen.getByLabelText('ひとこと（任意）'), '上書きしない');

    expect(updateAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /水を飲む/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ストレッチ/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '再試行する' })).not.toBeInTheDocument();
    expect(getDraft).toHaveBeenCalledWith(routine.id);
  });

  it('完了の通信結果が不明でドラフトが残っていても再完了せず履歴確認を案内する', async () => {
    const user = userEvent.setup();
    const complete = vi.fn().mockRejectedValueOnce(new Error('network error'));
    const getDraft = vi.fn().mockResolvedValue({ executedRoutineActionIdentifiers: [routine.steps[0].id], memo: '確認中' });
    renderPage(service({ complete, getDraft }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.click(await screen.findByRole('button', { name: '実行結果を投稿する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('完了済みの可能性があります。履歴を確認してください。');
    expect(screen.queryByText('お疲れ様でした！')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '再試行する' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '実行結果を投稿する' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '実行履歴を確認する' }));
    expect(await screen.findByText('実行履歴')).toBeInTheDocument();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(getDraft).toHaveBeenCalledWith(routine.id);
  });

  it('完了POSTが契約上確実に失敗した422では、ドラフト確認後に明示的に再試行できる', async () => {
    const user = userEvent.setup();
    const complete = vi.fn()
      .mockRejectedValueOnce(new RoutineExecutionError('invalid', 422))
      .mockResolvedValueOnce(undefined);
    renderPage(service({ complete }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.click(screen.getByRole('button', { name: '実行結果を投稿する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ドラフトは残っています。完了を再試行できます。');

    await user.click(screen.getByRole('button', { name: '再試行する' }));
    expect(await screen.findByText('お疲れ様でした！')).toBeInTheDocument();
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('401のときは認証状態を破棄してログイン画面へ遷移する', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    renderPage(service({ complete: vi.fn().mockRejectedValue(new RoutineExecutionError('unauthorized', 401)) }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.click(await screen.findByRole('button', { name: '実行結果を投稿する' }));

    expect(await screen.findByText('ログイン')).toBeInTheDocument();
    expect(isAuthenticated()).toBe(false);
  });

  it('認証切替後は旧認証状態でキュー済みの保存を実行しない', async () => {
    const user = userEvent.setup();
    const updateAction = vi.fn()
      .mockRejectedValueOnce(new RoutineExecutionError('unauthorized', 401))
      .mockResolvedValueOnce(undefined);
    renderPage(service({ updateAction }));

    const action = await screen.findByRole('button', { name: /水を飲む/ });
    await user.click(action);
    await user.click(action);

    expect(await screen.findByText('ログイン')).toBeInTheDocument();
    expect(updateAction).toHaveBeenCalledTimes(1);
  });

  it('アカウント切替後は旧キューを送信せず、古いドラフトを表示しない', async () => {
    const user = userEvent.setup();
    let resolveFirst: (() => void) | undefined;
    let resolveNewDraft: ((draft: { executedRoutineActionIdentifiers: string[]; memo: string }) => void) | undefined;
    const updateAction = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirst = resolve; }));
    const start = vi.fn()
      .mockResolvedValueOnce({ executedRoutineActionIdentifiers: [routine.steps[0].id], memo: '旧アカウントの下書き' })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewDraft = resolve; }));
    markAuthenticated();
    renderPage(service({ start, updateAction }));

    expect(await screen.findByDisplayValue('旧アカウントの下書き')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /水を飲む/ }));
    await user.click(screen.getByRole('button', { name: /水を飲む/ }));
    markAuthenticated();

    await waitFor(() => expect(screen.queryByDisplayValue('旧アカウントの下書き')).not.toBeInTheDocument());
    resolveFirst?.();
    resolveNewDraft?.({ executedRoutineActionIdentifiers: [], memo: '新アカウントの下書き' });

    expect(await screen.findByDisplayValue('新アカウントの下書き')).toBeInTheDocument();
    expect(updateAction).toHaveBeenCalledTimes(1);
  });

  it('ドラフト再取得が401なら認証切れとしてログイン画面へ遷移する', async () => {
    const user = userEvent.setup();
    markAuthenticated();
    renderPage(service({
      complete: vi.fn().mockRejectedValue(new Error('network error')),
      getDraft: vi.fn().mockRejectedValue(new RoutineExecutionError('unauthorized', 401)),
    }));

    await user.click(await screen.findByRole('button', { name: /水を飲む/ }));
    await user.click(screen.getByRole('button', { name: '実行結果を投稿する' }));

    expect(await screen.findByText('ログイン')).toBeInTheDocument();
    expect(isAuthenticated()).toBe(false);
  });

  it('存在しないルーティンではドラフトを作成しない', async () => {
    const start = vi.fn();
    renderPage(service({ get: vi.fn().mockResolvedValue(null), start }), '/routines/missing/execute');

    expect(await screen.findByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Homeへ戻る' })).toHaveAttribute('href', '/home');
    expect(start).not.toHaveBeenCalled();
  });
});