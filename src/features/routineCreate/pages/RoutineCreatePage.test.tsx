import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineCreatePage } from './RoutineCreatePage';
import { RoutineCreateUnauthorizedError, type RoutineCreateService } from '../services/routineCreateService';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderPage(service: RoutineCreateService) {
  return render(<MemoryRouter><RoutineCreatePage service={service} /><Location /></MemoryRouter>);
}

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

async function fillMinimumForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/ルーティン名/), '朝の習慣');
  await user.type(screen.getByPlaceholderText('行動の内容'), '水を飲む');
}

function submitForm() {
  const form = document.getElementById('routine-create-form');
  if (!form) {
    throw new Error('Routine create form is not rendered');
  }

  fireEvent.submit(form);
}

describe('RoutineCreatePage', () => {
  it('送信前に validation error を表示し、送信しない', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    renderPage({ create });

    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('行動の内容を入力してください。');
    expect(create).not.toHaveBeenCalled();
  });

  it('PC用投稿ボタンは入力不備と送信中もアニメーションを表示しつつ、既存フォームへ一度だけ送信する', async () => {
    const user = userEvent.setup();
    let resolveCreate: (() => void) | undefined;
    const create = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveCreate = resolve; }));
    renderPage({ create });

    const submitButton = screen.getByRole('button', { name: '投稿' });
    expect(submitButton).toHaveAttribute('form', 'routine-create-form');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveClass('routine-create-desktop-submit__button--attention');
    await fillMinimumForm(user);
    expect(submitButton).toBeEnabled();
    expect(submitButton).toHaveClass('routine-create-desktop-submit__button--attention');

    await user.click(submitButton);
    expect(create).toHaveBeenCalledTimes(1);
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveClass('routine-create-desktop-submit__button--attention');
    await user.click(submitButton);
    expect(create).toHaveBeenCalledTimes(1);

    resolveCreate?.();
    expect(await screen.findByText('ルーティンを投稿しました。')).toBeInTheDocument();
  });

  it('PC投稿ボタンの案内は5秒後にフェードを始め、完了後に関連付けを解除して再入時に再表示する', async () => {
    vi.useFakeTimers();
    const service = { create: vi.fn().mockResolvedValue(undefined) };
    const firstPage = renderPage(service);

    const firstSubmitButton = screen.getByRole('button', { name: '投稿' });
    expect(firstSubmitButton).toHaveAttribute('aria-describedby');
    expect(document.querySelector('.routine-create-desktop-submit__guide')).toHaveAttribute(
      'id',
      firstSubmitButton.getAttribute('aria-describedby'),
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(4_999); });

    expect(document.querySelector('.routine-create-desktop-submit__guide')).not.toHaveClass('routine-create-desktop-submit__guide--fading');
    expect(firstSubmitButton).toHaveAttribute('aria-describedby');

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });

    expect(document.querySelector('.routine-create-desktop-submit__guide')).toHaveClass('routine-create-desktop-submit__guide--fading');
    expect(firstSubmitButton).toHaveAttribute('aria-describedby');

    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    expect(document.querySelector('.routine-create-desktop-submit__guide')).not.toBeInTheDocument();
    expect(firstSubmitButton).not.toHaveAttribute('aria-describedby');

    firstPage.unmount();
    renderPage(service);

    const reenteredSubmitButton = screen.getByRole('button', { name: '投稿' });
    expect(reenteredSubmitButton).toHaveAttribute('aria-describedby');
    expect(document.querySelector('.routine-create-desktop-submit__guide')).toHaveAttribute(
      'id',
      reenteredSubmitButton.getAttribute('aria-describedby'),
    );
  });

  it('同一tickのフォーム連続submitは一度だけ送信し、失敗後は再送できる', async () => {
    let rejectFirstCreate: ((error: Error) => void) | undefined;
    let resolveSecondCreate: (() => void) | undefined;
    const create = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectFirstCreate = reject; }))
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveSecondCreate = resolve; }));
    renderPage({ create });
    fireEvent.change(screen.getByLabelText(/ルーティン名/), { target: { value: '朝の習慣' } });
    fireEvent.change(screen.getByPlaceholderText('行動の内容'), { target: { value: '水を飲む' } });

    submitForm();
    submitForm();
    expect(create).toHaveBeenCalledTimes(1);

    rejectFirstCreate?.(new Error('failed'));
    expect(await screen.findByRole('alert')).toHaveTextContent('ルーティンを投稿できませんでした。時間をおいて再試行してください。');
    submitForm();
    expect(create).toHaveBeenCalledTimes(2);
    resolveSecondCreate?.();
    expect(await screen.findByText('ルーティンを投稿しました。')).toBeInTheDocument();
  });

  it('ステップを追加・並べ替え・削除できる', async () => {
    const user = userEvent.setup();
    renderPage({ create: vi.fn().mockResolvedValue(undefined) });

    await user.type(screen.getByPlaceholderText('行動の内容'), '一番目');
    await user.click(screen.getByRole('button', { name: 'ステップを追加' }));
    const actionInputs = screen.getAllByPlaceholderText('行動の内容');
    await user.type(actionInputs[1], '二番目');
    await user.click(screen.getByRole('button', { name: '上へ移動 2' }));

    expect(screen.getAllByDisplayValue(/番目/).map((input) => (input as HTMLInputElement).value)).toEqual(['二番目', '一番目']);
    await user.click(screen.getByRole('button', { name: 'ステップを削除 1' }));
    expect(screen.getAllByPlaceholderText('行動の内容')).toHaveLength(1);
    expect(screen.getByDisplayValue('一番目')).toBeInTheDocument();
  });

  it('お気に入りタグを優先して候補表示し、選択と解除をして投稿できる', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    renderPage({
      create,
      loadFavoriteTags: async () => [{ identifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '朝活' }],
      searchTagCandidates: async () => [{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '運動' }],
    });

    expect(await screen.findByText('朝活')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '朝活を解除' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /を選択$/ }).map((button) => button.getAttribute('aria-label'))).toEqual(['朝活を選択']);

    await user.type(screen.getByRole('searchbox', { name: 'タグを検索' }), '運');
    expect(await screen.findByText('運動')).toBeInTheDocument();
    expect(screen.queryByText('朝活')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'タグを検索' }));

    await user.click(screen.getByRole('button', { name: '朝活を選択' }));
    await user.click(screen.getByRole('button', { name: '朝活を解除' }));
    await user.type(screen.getByRole('searchbox', { name: 'タグを検索' }), '運');
    expect(await screen.findByRole('button', { name: '運動を選択' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '運動を選択' }));
    await fillMinimumForm(user);
    submitForm();

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      tagIdentifiers: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
    }));
  });

  it('検索入力をデバウンスし、古い検索応答で新しい候補を上書きしない', async () => {
    vi.useFakeTimers();
    let resolveMorning: (tags: Array<{ identifier: string; label: string }>) => void = () => undefined;
    let resolveExercise: (tags: Array<{ identifier: string; label: string }>) => void = () => undefined;
    const searchTagCandidates = vi.fn()
      .mockImplementationOnce(() => new Promise<Array<{ identifier: string; label: string }>>((resolve) => { resolveMorning = resolve; }))
      .mockImplementationOnce(() => new Promise<Array<{ identifier: string; label: string }>>((resolve) => { resolveExercise = resolve; }));
    renderPage({
      create: vi.fn().mockResolvedValue(undefined),
      loadFavoriteTags: async () => [],
      searchTagCandidates,
    });

    fireEvent.change(screen.getByRole('searchbox', { name: 'タグを検索' }), { target: { value: '朝' } });
    await vi.advanceTimersByTimeAsync(300);
    fireEvent.change(screen.getByRole('searchbox', { name: 'タグを検索' }), { target: { value: '運' } });
    await vi.advanceTimersByTimeAsync(300);
    await act(async () => { resolveExercise([{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '運動' }]); });
    expect(screen.getByRole('button', { name: '運動を選択' })).toBeInTheDocument();
    await act(async () => { resolveMorning([{ identifier: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', label: '朝食' }]); });

    expect(screen.queryByRole('button', { name: '朝食を選択' })).not.toBeInTheDocument();
    expect(searchTagCandidates).toHaveBeenNthCalledWith(1, '朝');
    expect(searchTagCandidates).toHaveBeenNthCalledWith(2, '運');
  });

  it('選択済みタグは検索候補が変わっても表示され、解除できる', async () => {
    const user = userEvent.setup();
    const searchTagCandidates = vi.fn()
      .mockResolvedValueOnce([{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '運動' }])
      .mockResolvedValueOnce([{ identifier: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', label: '読書' }]);
    renderPage({ create: vi.fn().mockResolvedValue(undefined), loadFavoriteTags: async () => [], searchTagCandidates });

    await user.type(screen.getByRole('searchbox', { name: 'タグを検索' }), '運');
    await user.click(await screen.findByRole('button', { name: '運動を選択' }));
    await user.clear(screen.getByRole('searchbox', { name: 'タグを検索' }));
    await user.type(screen.getByRole('searchbox', { name: 'タグを検索' }), '読');

    expect(await screen.findByRole('button', { name: '読書を選択' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '運動を解除' }));
    expect(screen.queryByRole('button', { name: '運動を解除' })).not.toBeInTheDocument();
  });

  it('入力変更時に古い候補をすぐ非表示にし、IME確定後だけ検索する', async () => {
    vi.useFakeTimers();
    const searchTagCandidates = vi.fn().mockResolvedValue([{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '運動' }]);
    renderPage({ create: vi.fn().mockResolvedValue(undefined), loadFavoriteTags: async () => [], searchTagCandidates });

    fireEvent.change(screen.getByRole('searchbox', { name: 'タグを検索' }), { target: { value: '運' } });
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByRole('button', { name: '運動を選択' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'タグを検索' }), { target: { value: '朝' } });
    expect(screen.queryByRole('button', { name: '運動を選択' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'タグを検索' }), { target: { value: '' } });

    fireEvent.compositionStart(screen.getByRole('searchbox', { name: 'タグを検索' }), { data: '朝' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'タグを検索' }), { target: { value: '朝活' } });
    await vi.advanceTimersByTimeAsync(300);
    expect(searchTagCandidates).toHaveBeenCalledTimes(1);
    fireEvent.compositionEnd(screen.getByRole('searchbox', { name: 'タグを検索' }), { data: '活' });
    await vi.advanceTimersByTimeAsync(300);
    expect(searchTagCandidates).toHaveBeenLastCalledWith('朝活');
  });

  it('IME変換中も入力値を表示し、compositionend後の同値inputで確定検索を無効化しない', async () => {
    vi.useFakeTimers();
    const searchTagCandidates = vi.fn().mockResolvedValue([{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '朝活' }]);
    renderPage({ create: vi.fn().mockResolvedValue(undefined), loadFavoriteTags: async () => [], searchTagCandidates });
    const searchInput = screen.getByRole('searchbox', { name: 'タグを検索' });

    fireEvent.compositionStart(searchInput, { data: '朝' });
    fireEvent.change(searchInput, { target: { value: '朝活' } });
    expect(searchInput).toHaveValue('朝活');
    fireEvent.compositionEnd(searchInput, { data: '活' });
    await act(async () => {});
    fireEvent.input(searchInput, { target: { value: '朝活' } });
    await vi.advanceTimersByTimeAsync(300);
    await act(async () => {});

    expect(searchTagCandidates).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '朝活を選択' })).toBeInTheDocument();
  });

  it('IMEで空文字に確定した場合も入力値と検索候補を空にする', async () => {
    vi.useFakeTimers();
    const searchTagCandidates = vi.fn().mockResolvedValue([{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '運動' }]);
    renderPage({ create: vi.fn().mockResolvedValue(undefined), loadFavoriteTags: async () => [], searchTagCandidates });
    const searchInput = screen.getByRole('searchbox', { name: 'タグを検索' });

    fireEvent.change(searchInput, { target: { value: '運' } });
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByRole('button', { name: '運動を選択' })).toBeInTheDocument();
    fireEvent.compositionStart(searchInput, { data: '運' });
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(searchInput).toHaveValue('');
    fireEvent.compositionEnd(searchInput, { data: '' });
    await act(async () => {});
    fireEvent.input(searchInput, { target: { value: '' } });

    expect(screen.queryByRole('button', { name: '運動を選択' })).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(300);
    expect(searchTagCandidates).toHaveBeenCalledTimes(1);
  });

  it('投稿 API の 401 では認証状態を失効させログインへ遷移する', async () => {
    const user = userEvent.setup();
    renderPage({ create: vi.fn().mockRejectedValue(new RoutineCreateUnauthorizedError()) });

    await fillMinimumForm(user);
    submitForm();

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'));
  });

  it('タグ候補の取得に失敗しても、タグ未選択で投稿できる', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    renderPage({
      create,
      loadFavoriteTags: async () => { throw new Error('failed'); },
      searchTagCandidates: async () => { throw new Error('failed'); },
    });

    await fillMinimumForm(user);
    submitForm();

    expect(create).toHaveBeenCalledWith(expect.not.objectContaining({ tagIdentifiers: expect.anything() }));
  });

  it('タグ検索の失敗を表示し、再試行で候補を復旧する', async () => {
    const user = userEvent.setup();
    const searchTagCandidates = vi.fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce([{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '運動' }]);
    renderPage({ create: vi.fn().mockResolvedValue(undefined), loadFavoriteTags: async () => [], searchTagCandidates });

    await user.type(screen.getByRole('searchbox', { name: 'タグを検索' }), '運');
    expect(await screen.findByRole('alert')).toHaveTextContent('タグを読み込めませんでした。');
    await user.click(screen.getByRole('button', { name: 'タグを再試行' }));

    expect(await screen.findByRole('button', { name: '運動を選択' })).toBeInTheDocument();
    expect(searchTagCandidates).toHaveBeenCalledTimes(2);
  });

  it('お気に入りタグ取得の 401 では認証状態を失効させログインへ遷移する', async () => {
    renderPage({
      create: vi.fn().mockResolvedValue(undefined),
      loadFavoriteTags: async () => { throw new RoutineCreateUnauthorizedError(); },
      searchTagCandidates: async () => [],
    });

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'));
  });

  it('お気に入りタグの取得に失敗しても、検索可能な候補は表示する', async () => {
    renderPage({
      create: vi.fn().mockResolvedValue(undefined),
      loadFavoriteTags: async () => { throw new Error('failed'); },
      searchTagCandidates: async () => [{ identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: '運動' }],
    });

    fireEvent.change(screen.getByRole('searchbox', { name: 'タグを検索' }), { target: { value: '運' } });
    expect(await screen.findByRole('button', { name: '運動を選択' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('お気に入りタグを読み込めませんでした。');
  });

  it('送信中、成功状態を表示し、成功 payload を service に渡す', async () => {
    const user = userEvent.setup();
    let resolveCreate: (() => void) | undefined;
    const create = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveCreate = resolve; }));
    renderPage({ create });

    await fillMinimumForm(user);
    submitForm();
    expect(create).toHaveBeenCalledWith({
      actions: [{ actionMemo: '', actionMinutes: '', actionName: '水を飲む' }],
      routineExecutionMinutes: '',
      routineMemo: '',
      routineName: '朝の習慣',
    });

    resolveCreate?.();
    expect(await screen.findByText('ルーティンを投稿しました。')).toBeInTheDocument();
  });

  it('API送信から0.5秒後にローディングを表示し、表示後も0.5秒維持する', async () => {
    let resolveCreate: (() => void) | undefined;
    const create = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveCreate = resolve; }));
    renderPage({ create });

    fireEvent.change(screen.getByLabelText(/ルーティン名/), { target: { value: '朝の習慣' } });
    fireEvent.change(screen.getByPlaceholderText('行動の内容'), { target: { value: '水を飲む' } });
    submitForm();

    await new Promise<void>((resolve) => { window.setTimeout(resolve, 550); });
    expect(screen.getByText('投稿しています…')).toBeInTheDocument();

    resolveCreate?.();
    await new Promise<void>((resolve) => { window.setTimeout(resolve, 450); });
    expect(screen.getByText('投稿しています…')).toBeInTheDocument();
    await new Promise<void>((resolve) => { window.setTimeout(resolve, 100); });
    expect(screen.getByText('ルーティンを投稿しました。')).toBeInTheDocument();
  });

  it('送信失敗時に API error を表示する', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockRejectedValue(new Error('failed'));
    renderPage({ create });

    await fillMinimumForm(user);
    submitForm();

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ルーティンを投稿できませんでした。時間をおいて再試行してください。'));
  });
});
