import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

function ThrowingThemeProvider(): never {
  throw new Error('theme provider render failure');
}

function ThrowingRouterProvider(): never {
  throw new Error('router provider render failure');
}

function expectFallback() {
  expect(screen.getByRole('heading', { name: '問題が発生しました' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('申し訳ありません。画面を表示できませんでした。');
  expect(screen.queryByText(/provider render failure/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '再試行' })).toHaveAttribute('href', window.location.href);
  expect(screen.getByRole('link', { name: 'Homeへ戻る' })).toHaveAttribute('href', '/home');
  expect(screen.getByRole('link', { name: '再試行' })).not.toHaveClass(/Mui/);
  expect(screen.getByRole('link', { name: 'Homeへ戻る' })).not.toHaveClass(/Mui/);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AppErrorBoundary', () => {
  it('AppThemeProviderの例外でもMUIテーマに依存しないfallbackを表示する', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<AppErrorBoundary><ThrowingThemeProvider /></AppErrorBoundary>);

    expectFallback();
    expect(screen.queryByText('theme provider render failure')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it('RouterProviderの例外でもRouterに依存しないfallbackを表示する', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<AppErrorBoundary><ThrowingRouterProvider /></AppErrorBoundary>);

    expectFallback();
    expect(screen.queryByText('router provider render failure')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });
});
