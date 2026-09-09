import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Routine } from '../domain/routine';
import { RoutineCard } from './RoutineCard';

const routine: Routine = {
  accountId: '10000000-0000-4000-8000-000000000001',
  authorName: '田中 陽介',
  createdAt: '2026-09-04T00:00:00+00:00',
  customizations: 3,
  durationMinutes: 25,
  executions: 12,
  id: 'post-1',
  liked: false,
  likes: 14,
  routineId: 'routine-1',
  steps: [{ action: '水を飲む', durationMinutes: 5 }],
  tags: ['朝活'],
  title: '朝の集中ルーティン',
};

describe('RoutineCard', () => {
  it('いいねタップは親要素へ伝播しない', async () => {
    const onLike = vi.fn();
    const onCardClick = vi.fn();
    const user = userEvent.setup();
    render(<MemoryRouter><div onClick={onCardClick}><RoutineCard onLike={onLike} routine={routine} /></div></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'いいねする' }));

    expect(onLike).toHaveBeenCalledWith('post-1');
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
