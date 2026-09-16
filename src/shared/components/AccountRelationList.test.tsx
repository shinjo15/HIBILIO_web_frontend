import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AccountRelationList } from './AccountRelationList';

describe('AccountRelationList', () => {
  it('アカウントのiconImageUrlを表示する', () => {
    render(<MemoryRouter><AccountRelationList accounts={[{ accountIdentifier: 'account-1', bio: null, iconImageUrl: 'https://example.com/icons/account.webp', name: 'アカウント' }]} /></MemoryRouter>);

    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.com/icons/account.webp');
  });
});
