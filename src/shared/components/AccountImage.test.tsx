import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountAvatar } from './AccountImage';

describe('AccountAvatar', () => {
  it('画像URLを表示し、読み込み失敗時はイニシャルへ戻す', () => {
    const { rerender } = render(<AccountAvatar className="avatar" iconImageUrl="https://example.com/icon.webp" initial="山" />);

    const image = screen.getByAltText('');
    expect(image).toHaveAttribute('src', 'https://example.com/icon.webp');
    fireEvent.error(image);
    expect(screen.queryByAltText('')).not.toBeInTheDocument();
    expect(screen.getByText('山')).toBeInTheDocument();

    rerender(<AccountAvatar className="avatar" iconImageUrl="https://example.com/new-icon.webp" initial="山" />);

    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.com/new-icon.webp');
  });
});
