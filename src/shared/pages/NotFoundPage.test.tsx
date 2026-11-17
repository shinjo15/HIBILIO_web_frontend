import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AppThemeProvider } from '../../app/AppThemeProvider';
import { NotFoundPage } from './NotFoundPage';
import { notFoundMotion } from './notFoundMotion';

function renderNotFoundPage() {
  return render(
    <AppThemeProvider>
      <MemoryRouter><NotFoundPage /></MemoryRouter>
    </AppThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('hibilio-theme-dark');
  document.documentElement.style.removeProperty('--hibilio-color-primary');
});

describe('NotFoundPage', () => {
  it('ページが見つからないこととHomeへ戻る導線を表示する', () => {
    const { container } = renderNotFoundPage();

    expect(screen.getByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument();
    expect(screen.getByText('お探しのページは見つかりませんでした。')).toBeInTheDocument();
    expect(screen.getByText('ちょっと寄り道しちゃったみたいです。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Homeへ戻る' })).toHaveAttribute('href', '/home');
    expect(container.querySelector('img[src="/favicon.svg"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('404数字はテーマ色、見出しはテーマ本文色を実際のMUIスタイルとして使用する', () => {
    renderNotFoundPage();

    expect(getComputedStyle(screen.getByText('404')).color).toBe('var(--hibilio-color-primary)');
    expect(getComputedStyle(screen.getByRole('heading', { name: 'ページが見つかりません' })).color).toBe('var(--hibilio-color-on-background)');
  });

  it('404と見出し、および見出しと説明の間にMUIテーマの24px余白を設ける', () => {
    renderNotFoundPage();

    const code = screen.getByText('404');
    const heading = screen.getByRole('heading', { name: 'ページが見つかりません' });
    const description = screen.getByText('お探しのページは見つかりませんでした。');

    expect(getComputedStyle(code).marginBottom).toBe('24px');
    expect(getComputedStyle(heading).marginBottom).toBe('24px');
    expect(description.previousElementSibling).toBe(heading);
  });

  it('アイコンを反時計回りに一周回転させながら上下に動かし、動きを減らす設定では両方を停止する', () => {
    const { container } = renderNotFoundPage();

    expect(notFoundMotion.spin.animation).toContain('linear infinite');
    expect(notFoundMotion.spin.keyframes['0%'].transform).toBe('rotate(0deg)');
    expect(notFoundMotion.spin.keyframes['100%'].transform).toBe('rotate(-360deg)');
    expect(notFoundMotion.float.keyframes['0%, 100%'].transform).toBe('translateY(0)');
    expect(notFoundMotion.float.keyframes['50%'].transform).toBe('translateY(-10px)');
    expect(notFoundMotion.reduce.animation).toBe('none');
    expect(container.querySelector('[data-testid="not-found-icon-float"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="not-found-icon-spin"]')).toBeInTheDocument();
  });
});
