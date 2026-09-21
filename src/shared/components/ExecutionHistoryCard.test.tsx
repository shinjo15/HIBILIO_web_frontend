import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionHistoryCard } from './ExecutionHistoryCard';

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
});
