import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Routine } from '../domain/routine';
import { RoutineCard } from './RoutineCard';

afterEach(cleanup);

const routine: Routine = {
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
  routineId: 'routine-1',
  steps: [{ action: '水を飲む', durationMinutes: 5 }],
  tags: ['朝活'],
  title: '朝の集中ルーティン',
};

describe('RoutineCard', () => {
  it('閲覧可能なカスタマイズ元は親ルーティン・作者・アイコンを表示し、親詳細へリンクする', () => {
    const customizedRoutine = {
      ...routine,
      customizationOrigin: {
        accountName: '親作者',
        iconImageUrl: 'https://example.com/icons/parent.webp',
        routineId: 'parent-routine-1',
        routineName: '親の朝活ルーティン',
      },
    };
    render(<MemoryRouter><RoutineCard routine={customizedRoutine} /></MemoryRouter>);

    const origin = document.querySelector('.routine-card__customization-origin');
    expect(origin).toHaveTextContent('親の朝活ルーティン');
    expect(origin).toHaveTextContent('親作者');
    expect(origin?.querySelector('a')).toHaveAttribute('href', '/routines/parent-routine-1');
    expect(origin?.querySelector('img')).toHaveAttribute('src', 'https://example.com/icons/parent.webp');
    const title = screen.getByRole('heading', { name: '朝の集中ルーティン' });
    const titleRow = title.closest('.routine-card__title-row');
    expect(origin?.compareDocumentPosition(title)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(titleRow?.querySelector('.routine-card__origin-connector')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText('カスタマイズ元')).not.toBeInTheDocument();
  });

  it('カスタマイズ元のアイコンがnullなら既存Avatarの頭文字fallbackを表示する', () => {
    const customizedRoutine = {
      ...routine,
      customizationOrigin: {
        accountName: '親作者',
        iconImageUrl: null,
        routineId: 'parent-routine-1',
        routineName: '親の朝活ルーティン',
      },
    };
    render(<MemoryRouter><RoutineCard routine={customizedRoutine} /></MemoryRouter>);

    const origin = document.querySelector('.routine-card__customization-origin');
    expect(origin).toHaveTextContent('親');
    expect(origin?.querySelector('img')).toBeNull();
  });

  it('カスタマイズ元がnullの通常投稿では親情報を表示しない', () => {
    render(<MemoryRouter><RoutineCard routine={{ ...routine, customizationOrigin: null }} /></MemoryRouter>);

    expect(document.querySelector('.routine-card__customization-origin')).toBeNull();
    expect(document.querySelector('.routine-card__origin-connector')).toBeNull();
  });

  it('投稿なしroutineは同じカードで実データを表示し、投稿日時・いいね・通報を表示しない', () => {
    const routineWithoutPost = { ...routine, createdAt: null, id: null, liked: null, likes: null };
    render(<MemoryRouter><RoutineCard routine={routineWithoutPost} /></MemoryRouter>);

    expect(screen.getByRole('article')).toHaveClass('routine-card');
    expect(screen.getByRole('heading', { name: '朝の集中ルーティン' })).toBeInTheDocument();
    expect(screen.getByText('水を飲む')).toBeInTheDocument();
    expect(screen.getByText('25分')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'いいねする' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '投稿のメニュー' })).not.toBeInTheDocument();
    expect(screen.queryByText(/日前$/)).not.toBeInTheDocument();
  });

  it('いいねタップは親要素へ伝播しない', async () => {
    const onLike = vi.fn();
    const onCardClick = vi.fn();
    const user = userEvent.setup();
    render(<MemoryRouter><div onClick={onCardClick}><RoutineCard onLike={onLike} routine={routine} /></div></MemoryRouter>);

    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.com/icons/tanaka.webp');

    await user.click(screen.getByRole('button', { name: 'いいねする' }));

    expect(onLike).toHaveBeenCalledWith('post-1');
    expect(onCardClick).not.toHaveBeenCalled();
  });


  it('三点メニューから投稿通報フォームを開く', async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();
    render(<MemoryRouter><RoutineCard onReport={onReport} routine={routine} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: '投稿のメニュー' }));
    await user.click(screen.getByRole('menuitem', { name: 'この投稿を通報' }));

    expect(onReport).toHaveBeenCalledWith(routine);
  });
});
