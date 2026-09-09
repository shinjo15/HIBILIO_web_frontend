import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollManager } from './ScrollManager';

const scrollTo = vi.fn();

function Page({ name }: { name: string }) {
  const navigate = useNavigate();
  return <><h1>{name}</h1>{name === '一覧' ? <button onClick={() => navigate('/detail')} type="button">詳細へ</button> : <button onClick={() => navigate(-1)} type="button">戻る</button>}</>;
}

beforeEach(() => {
  vi.stubGlobal('scrollTo', scrollTo);
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
  scrollTo.mockClear();
});

afterEach(() => vi.unstubAllGlobals());

describe('ScrollManager', () => {
  it('通常遷移は先頭へ移動し、履歴戻りは元のスクロール位置を復元する', () => {
    const router = createMemoryRouter([
      {
        element: <ScrollManager />,
        children: [
          { element: <Page name="一覧" />, path: '/' },
          { element: <Page name="詳細" />, path: '/detail' },
        ],
      },
    ], { initialEntries: ['/'] });

    render(<RouterProvider router={router} />);
    scrollTo.mockClear();
    window.scrollY = 240;

    fireEvent.click(screen.getByRole('button', { name: '詳細へ' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 0 });

    window.scrollY = 80;
    fireEvent.click(screen.getByRole('button', { name: '戻る' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 240 });
  });
});
