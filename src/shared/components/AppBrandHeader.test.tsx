import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppBrandHeader } from './AppBrandHeader';

describe('AppBrandHeader', () => {
  it('keeps the mark and name in one row while placing the tagline below the row', () => {
    const { container } = render(<AppBrandHeader />);

    const brandRow = container.querySelector('.app-brand-header__brand');
    const tagline = screen.getByText('今日を重ねるSNS');
    expect(brandRow).toContainElement(screen.getByRole('heading', { name: 'HIBILIO' }));
    expect(brandRow).not.toContainElement(tagline);
    expect(tagline.parentElement).toHaveClass('app-brand-header');
  });

  it('does not render a search control', () => {
    render(<AppBrandHeader />);

    expect(screen.queryByRole('button', { name: 'ルーティンを検索' })).not.toBeInTheDocument();
  });
});
