import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExecutionHistoryCard } from './ExecutionHistoryCard';

afterEach(cleanup);

const execution = {
  executedActionCount: 2,
  id: 'execution-1',
  memo: '集中できました',
  postedAt: '2026-09-03T12:00:00+00:00',
  routineId: 'routine-1',
  routineTitle: '朝の集中ルーティン',
  supportCount: 3,
};

describe('ExecutionHistoryCard', () => {
  it('通報可能な実行投稿だけに三点メニューを表示し、選択せず通報を通知する', async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();
    const onSelect = vi.fn();
    render(<ExecutionHistoryCard execution={execution} onReport={onReport} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: '投稿のメニュー' }));
    await user.click(screen.getByRole('menuitem', { name: 'この投稿を通報' }));

    expect(onReport).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('三点メニューは選択ボタンの兄弟に置き、日時領域の予約対象を持つ', () => {
    render(<ExecutionHistoryCard author={{ iconImageUrl: null, name: 'とても長い表示名でも実行文言と日時を残す投稿者' }} execution={execution} onReport={vi.fn()} onSelect={vi.fn()} />);

    const select = screen.getByRole('button', { name: '朝の集中ルーティン' });
    const menu = screen.getByRole('button', { name: '投稿のメニュー' });
    expect(menu.parentElement).toBe(select.parentElement);
    expect(select).not.toContainElement(menu);
    expect(document.querySelector('.execution-history-card__metadata')).toHaveClass('execution-history-card__metadata--with-menu');
    expect(document.querySelector('.execution-history-card__author-name')).toHaveTextContent('とても長い表示名でも実行文言と日時を残す投稿者');
  });

  it('実行者の表示では種別を添え、作者がない場合も日時を右上ヘッダーに表示する', () => {
    const { rerender } = render(<ExecutionHistoryCard author={{ iconImageUrl: null, name: '田中 陽介' }} execution={execution} onSelect={vi.fn()} />);

    expect(document.querySelector('.execution-history-card__author')).toHaveTextContent('田中 陽介 がルーティンを実行');
    expect(document.querySelector('.execution-history-card__author .execution-history-card__action-label')).toHaveTextContent(/がルーティンを実行/);
    expect(document.querySelector('.execution-history-card__header .account-page__card-date')).not.toBeNull();

    rerender(<ExecutionHistoryCard execution={execution} onSelect={vi.fn()} />);

    expect(document.querySelector('.execution-history-card__header .account-page__card-date')).not.toBeNull();
  });

  it('実行履歴の要約を表示し、選択を通知する', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ExecutionHistoryCard execution={execution} onSelect={onSelect} />);

    expect(screen.getByRole('button', { name: '朝の集中ルーティン' })).toBeInTheDocument();
    expect(screen.getByText('集中できました')).toBeInTheDocument();
    expect(screen.getByText('達成項目数')).toHaveTextContent('2');
    expect(screen.getByText('応援')).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: '朝の集中ルーティン' }));

    expect(onSelect).toHaveBeenCalledWith(execution);
  });

  it('レンダー中もpointer移動を追跡し、ドラッグ後は詳細を選択しない', () => {
    const onSelect = vi.fn();
    const { rerender } = render(<ExecutionHistoryCard execution={execution} onSelect={onSelect} />);

    const select = screen.getByRole('button', { name: '朝の集中ルーティン' });
    fireEvent.pointerDown(select, { clientX: 0, clientY: 0, pointerId: 1 });

    rerender(<ExecutionHistoryCard execution={execution} onSelect={onSelect} />);

    fireEvent.pointerMove(document, { clientX: 9, clientY: 0, pointerId: 1 });
    fireEvent.click(select, { detail: 1 });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('pointer cancel後の次の通常クリックでは詳細を選択する', () => {
    const onSelect = vi.fn();
    render(<ExecutionHistoryCard execution={execution} onSelect={onSelect} />);

    const select = screen.getByRole('button', { name: '朝の集中ルーティン' });
    fireEvent.pointerDown(select, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerCancel(document, { pointerId: 1 });
    fireEvent.pointerDown(select, { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.pointerUp(document, { pointerId: 2 });
    fireEvent.click(select, { detail: 1 });

    expect(onSelect).toHaveBeenCalledWith(execution);
  });

  it('複数ポインターで追跡中のドラッグ状態を上書きせず、誤って詳細を選択しない', () => {
    const onSelect = vi.fn();
    render(<ExecutionHistoryCard execution={execution} onSelect={onSelect} />);

    const select = screen.getByRole('button', { name: '朝の集中ルーティン' });
    fireEvent.pointerDown(select, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(document, { clientX: 9, clientY: 0, pointerId: 1 });
    fireEvent.pointerDown(select, { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.click(select, { detail: 1 });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('unmount時にドキュメントのポインター追跡を解除する', () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<ExecutionHistoryCard execution={execution} onSelect={vi.fn()} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: '朝の集中ルーティン' }), { clientX: 0, clientY: 0, pointerId: 1 });
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function));
    removeEventListener.mockRestore();
  });

  it('キーボードでもカードを選択し、メニューはEnterで開ける', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ExecutionHistoryCard execution={execution} onReport={vi.fn()} onSelect={onSelect} />);

    await user.tab();
    await user.keyboard('{Enter}');
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(execution);
    expect(screen.getByRole('menuitem', { name: 'この投稿を通報' })).toBeInTheDocument();
  });
});
