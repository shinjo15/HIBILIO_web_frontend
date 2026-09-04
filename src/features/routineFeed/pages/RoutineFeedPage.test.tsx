import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoutineFeedPage } from './RoutineFeedPage';
import type { Routine } from '../domain/routine';
import type { RoutineFeedService } from '../services/routineFeedService';

const routine: Routine = {
  author: { handle: 'tanaka', name: '田中 陽介' },
  createdAt: '2026-09-04T00:00:00.000Z',
  customizations: 3,
  description: '朝の習慣',
  durationMinutes: 25,
  executions: 12,
  id: 'routine-1',
  liked: false,
  likes: 14,
  steps: [{ action: '水を飲む', time: '07:00' }],
  tags: ['朝活'],
  title: '朝の集中ルーティン',
};

afterEach(() => cleanup());

function renderPage(service: RoutineFeedService) {
  return render(<MemoryRouter><RoutineFeedPage service={service} /></MemoryRouter>);
}

describe('RoutineFeedPage', () => {
  it('loading 中の表示から一覧を表示し、いいね操作を提供する', async () => {
    let resolveList: ((value: Routine[]) => void) | undefined;
    const service: RoutineFeedService = {
      list: () => new Promise((resolve) => { resolveList = resolve; }),
    };

    renderPage(service);
    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ルーティンを検索' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['おすすめ', '人気', '新着']);
    expect(screen.queryByText('ルーティン一覧')).not.toBeInTheDocument();
    expect(screen.queryByText('みんなの習慣から、今日を整えるヒントを見つけよう。')).not.toBeInTheDocument();
    expect(screen.getByText('ルーティンを読み込んでいます…')).toBeInTheDocument();

    resolveList?.([routine]);
    expect(await screen.findByRole('heading', { name: '朝の集中ルーティン' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '朝の集中ルーティン' })).toHaveAttribute('href', '/routines/routine-1');

    await userEvent.click(screen.getByRole('button', { name: 'いいねする' }));
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'いいねを取り消す' })).toBeInTheDocument();
  });

  it('empty 状態を表示する', async () => {
    const service: RoutineFeedService = { list: async () => [] };

    renderPage(service);

    expect(await screen.findByRole('heading', { name: 'ルーティンが見つかりません' })).toBeInTheDocument();
  });

  it('error 状態と再試行導線を表示する', async () => {
    const service: RoutineFeedService = {
      list: vi.fn().mockRejectedValue(new Error('failed')),
    };

    renderPage(service);

    expect(await screen.findByText('ルーティンを読み込めませんでした。時間をおいて再試行してください。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument();
  });

  it('人気タブへ切り替えると service に選択値を渡す', async () => {
    const list = vi.fn().mockResolvedValue([routine]);
    const service: RoutineFeedService = { list };
    const user = userEvent.setup();

    renderPage(service);
    await screen.findByRole('heading', { name: '朝の集中ルーティン' });
    await user.click(screen.getByRole('tab', { name: '人気' }));

    await waitFor(() => expect(list).toHaveBeenLastCalledWith('popular'));
  });
});
