import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('モバイルナビゲーションでアカウント画面へ遷移できる', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [
          {
            element: <h1>一覧画面</h1>,
            index: true,
          },
          {
            element: <h1>アカウント画面</h1>,
            path: 'account',
          },
          {
            element: <h1>投稿画面</h1>,
            path: 'routines/new',
          },
        ],
      },
    ]);

    render(<RouterProvider router={router} />);

    await user.click(screen.getByRole('button', { name: 'アカウント' }));

    expect(screen.getByRole('heading', { name: 'アカウント画面' })).toBeInTheDocument();
  });
});
