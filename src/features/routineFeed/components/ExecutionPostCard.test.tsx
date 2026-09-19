import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Routine } from '../domain/routine';
import { ExecutionPostCard } from './ExecutionPostCard';

const executionPost: Routine & { routineExecutionId: string } = {
  accountId: '10000000-0000-4000-8000-000000000001',
  authorName: '田中 陽介',
  createdAt: '2026-09-04T00:00:00+00:00',
  customizations: 3,
  durationMinutes: 25,
  executions: 12,
  id: 'post-1',
  iconImageUrl: 'https://example.com/icons/tanaka.webp',
  liked: false,
  likes: 14,
  postCategory: 'action',
  routineExecutionId: '20000000-0000-4000-8000-000000000001',
  routineId: 'routine-1',
  steps: [{ action: '水を飲む', durationMinutes: 5 }],
  supported: true,
  tags: ['朝活'],
  title: '朝の集中ルーティン',
};

describe('ExecutionPostCard', () => {
  it('実行投稿を専用カードで表示し、タイトルから実行詳細を開く', () => {
    render(<MemoryRouter><ExecutionPostCard post={executionPost} /></MemoryRouter>);

    expect(screen.getByRole('article')).toHaveClass('execution-post-card');
    expect(screen.getByText('実行投稿')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '朝の集中ルーティン' })).toHaveAttribute('href', '/routines/routine-1/executions/20000000-0000-4000-8000-000000000001');
    expect(screen.getByRole('link', { name: '実行詳細を見る' })).toHaveAttribute('href', '/routines/routine-1/executions/20000000-0000-4000-8000-000000000001');
    expect(screen.getByLabelText('応援済み')).toBeInTheDocument();
  });

  it('三点メニューから実行投稿の通報フォームを開く', async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();

    render(<MemoryRouter><ExecutionPostCard onReport={onReport} post={executionPost} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: '投稿のメニュー' }));
    await user.click(screen.getByRole('menuitem', { name: 'この投稿を通報' }));

    expect(onReport).toHaveBeenCalledWith(executionPost);
  });
});
