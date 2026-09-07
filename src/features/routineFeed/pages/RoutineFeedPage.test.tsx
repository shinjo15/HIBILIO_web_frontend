import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineFeedPage } from './RoutineFeedPage';
import type { Routine } from '../domain/routine';
import type { RoutineFeedService } from '../services/routineFeedService';

const routine: Routine = {
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

afterEach(() => cleanup());

function renderPage(service: RoutineFeedService) {
  return render(<MemoryRouter><RoutineFeedPage service={service} /></MemoryRouter>);
}

describe('RoutineFeedPage', () => {
  it('loading中の表示からAPI由来の一覧を表示する', async () => {
    let resolveList: ((value: Routine[]) => void) | undefined;
    const service: RoutineFeedService = {
      list: () => new Promise((resolve) => { resolveList = resolve; }),
    };

    renderPage(service);
    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ルーティンを検索' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['フォロー中', 'おすすめ', '人気']);
    expect(screen.getByText('ルーティンを読み込んでいます…')).toBeInTheDocument();

    resolveList?.([routine]);
    expect(await screen.findByRole('heading', { name: '朝の集中ルーティン' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '朝の集中ルーティン' })).toHaveAttribute('href', '/routines/routine-1');
    expect(screen.queryByRole('button', { name: 'いいねする' })).not.toBeInTheDocument();
  });

  it('empty状態を表示する', async () => {
    renderPage({ list: async () => [] });

    expect(await screen.findByRole('heading', { name: 'ルーティンが見つかりません' })).toBeInTheDocument();
  });

  it('401を含むエラー状態と再試行導線を表示する', async () => {
    const list = vi.fn().mockRejectedValue(new Error('401'));
    renderPage({ list });

    expect(await screen.findByText('ルーティンを読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '再試行' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('タブ切替時に対応するタブ値をserviceへ渡す', async () => {
    const list = vi.fn().mockResolvedValue([routine]);
    const user = userEvent.setup();
    renderPage({ list });
    await screen.findByRole('heading', { name: '朝の集中ルーティン' });

    await user.click(screen.getByRole('tab', { name: 'フォロー中' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith('following'));
    await user.click(screen.getByRole('tab', { name: '人気' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith('popular'));
  });
});