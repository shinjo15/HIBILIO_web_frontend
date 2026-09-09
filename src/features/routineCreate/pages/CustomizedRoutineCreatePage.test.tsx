import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomizedRoutineCreatePage } from './CustomizedRoutineCreatePage';
import { createRoutineDetailService } from '../../routineDetail/services/routineDetailService';
import type { RoutineCreateService } from '../services/routineCreateService';

const parentRoutine = {
  author: { handle: '', name: '作成者' },
  customizations: 0,
  customizationsList: [],
  description: '元の説明',
  durationMinutes: 30,
  executions: 0,
  executionPosts: [],
  id: '30000000-0000-4000-8000-000000000001',
  liked: false,
  likes: 0,
  steps: [
    { action: '水を飲む', memo: '常温で飲む', minutes: 5 },
    { action: '散歩する', minutes: 25 },
  ],
  tags: [],
  title: '朝のルーティン',
};

afterEach(() => cleanup());

function renderPage(service: RoutineCreateService) {
  return render(
    <MemoryRouter initialEntries={['/routines/30000000-0000-4000-8000-000000000001/customize']}>
      <Routes>
        <Route
          element={<CustomizedRoutineCreatePage detailService={createRoutineDetailService({ get: async () => parentRoutine })} service={service} />}
          path="/routines/:routineId/customize"
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CustomizedRoutineCreatePage', () => {
  it('親ルーティンを初期値として表示し、親ルーティン識別子を送信する', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    renderPage({ create });

    expect(await screen.findByRole('heading', { name: 'ルーティンをカスタマイズ' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('朝のルーティン')).toBeInTheDocument();
    expect(screen.getByDisplayValue('元の説明')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('行動の内容')).toHaveLength(2);

    fireEvent.submit(document.getElementById('routine-create-form')!);

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
      actions: [
        { actionMemo: '常温で飲む', actionMinutes: '5', actionName: '水を飲む' },
        { actionMemo: '', actionMinutes: '25', actionName: '散歩する' },
      ],
      parentRoutineIdentifier: '30000000-0000-4000-8000-000000000001',
      routineExecutionMinutes: '30',
    })));
  });
});
