import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppThemeProvider } from '../../app/AppThemeProvider';
import { UnexpectedErrorPage } from './UnexpectedErrorPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UnexpectedErrorPage', () => {
  it('ルート描画中の未捕捉例外を内部情報なしの共通エラー画面に置き換える', async () => {
    const renderFailure = new Error('internal route failure');
    const ThrowInRoute = () => {
      throw renderFailure;
    };
    const router = createMemoryRouter([
      { element: <ThrowInRoute />, errorElement: <UnexpectedErrorPage /> },
    ]);

    render(<AppThemeProvider><RouterProvider router={router} /></AppThemeProvider>);

    expect(await screen.findByRole('heading', { name: '問題が発生しました' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('申し訳ありません。画面を表示できませんでした。');
    expect(screen.queryByText('internal route failure')).not.toBeInTheDocument();
    expect(screen.queryByText(renderFailure.stack!)).not.toBeInTheDocument();
  });

  it('ルート描画例外では再試行とHomeを通常のGET遷移として提供し、actionを実行しない', async () => {
    const action = vi.fn(() => null);
    const ThrowInRoute = () => {
      throw new Error('render failure');
    };
    const routes: RouteObject[] = [
      { action, element: <ThrowInRoute />, errorElement: <UnexpectedErrorPage />, path: '/' },
      { element: <p>Home</p>, path: '/home' },
    ];
    const router = createMemoryRouter(routes);

    render(<AppThemeProvider><RouterProvider router={router} /></AppThemeProvider>);

    await screen.findByRole('heading', { name: '問題が発生しました' });
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: '再試行' })).toHaveAttribute('href', window.location.href);
    expect(screen.getByRole('link', { name: 'Homeへ戻る' })).toHaveAttribute('href', '/home');
    expect(screen.getByRole('link', { name: '再試行' })).toHaveClass('MuiButton-contained');
    expect(screen.getByRole('link', { name: 'Homeへ戻る' })).toHaveClass('MuiButton-outlined');
    expect(action).not.toHaveBeenCalled();
  });

  it('ルーターのないpreviewでもHomeへ通常遷移できる導線を提供する', () => {
    render(<AppThemeProvider><UnexpectedErrorPage /></AppThemeProvider>);

    expect(screen.getByRole('link', { name: 'Homeへ戻る' })).toHaveAttribute('href', '/home');
  });

  it('再読み込みで未保存の入力内容が失われる可能性を伝える', async () => {
    const router = createMemoryRouter([
      { element: <UnexpectedErrorPage />, path: '/' },
    ]);

    render(<AppThemeProvider><RouterProvider router={router} /></AppThemeProvider>);

    expect(await screen.findByText('再読み込みすると、保存されていない入力内容は失われる可能性があります。')).toBeInTheDocument();
  });

  it('MUIのエラーアイコンを本文のpスタイルと競合させず、テーマ色で強調する', async () => {
    const router = createMemoryRouter([{ element: <UnexpectedErrorPage />, path: '/' }]);

    render(<AppThemeProvider><RouterProvider router={router} /></AppThemeProvider>);

    const icon = await screen.findByTestId('ErrorOutlineRoundedIcon');
    expect(icon.tagName).toBe('svg');
    expect(icon.closest('p')).toBeNull();
    expect(icon).toHaveClass('MuiSvgIcon-colorPrimary');
    expect(getComputedStyle(icon).color).toBe('rgb(194, 97, 42)');
    expect(getComputedStyle(icon).width).toBe('104px');
    expect(getComputedStyle(icon).height).toBe('104px');
  });
});
