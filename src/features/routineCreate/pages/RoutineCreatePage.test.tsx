import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineCreatePage } from './RoutineCreatePage';
import type { RoutineCreateService } from '../services/routineCreateService';

afterEach(() => cleanup());

function renderPage(service: RoutineCreateService) {
  return render(<MemoryRouter><RoutineCreatePage service={service} /></MemoryRouter>);
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

  it('送信失敗時に API error を表示する', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockRejectedValue(new Error('failed'));
    renderPage({ create });

    await fillMinimumForm(user);
    submitForm();

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ルーティンを投稿できませんでした。時間をおいて再試行してください。'));
  });
});
