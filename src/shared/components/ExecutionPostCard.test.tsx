import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExecutionPostCard } from './ExecutionPostCard';

describe('ExecutionPostCard', () => {
  it('投稿者・実行内容・応援状態を表示し、実行詳細へ遷移する', () => {
    render(
      <MemoryRouter>
        <ExecutionPostCard
          post={{
            achievedActionCount: 2,
            authorInitial: '実',
            authorName: '実行した人',
            dateLabel: '今日',
            executionId: 'execution-1',
            iconImageUrl: 'https://example.com/icons/executor.webp',
            memo: '続けられました',
            routineId: 'routine-1',
            supportCount: 3,
            supported: true,
            totalActionCount: 4,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /実行した人/ })).toHaveAttribute('href', '/routines/routine-1/executions/execution-1');
    expect(screen.getByText('2 / 4 項目')).toBeInTheDocument();
    expect(screen.getByText(/続けられました/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '応援済み 実行した人' })).toHaveTextContent('3');
  });
});
