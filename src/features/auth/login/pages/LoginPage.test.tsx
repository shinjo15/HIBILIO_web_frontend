import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('モック準拠のログインUIから既存のパスコード認証へ進める', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Googleでログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Appleでログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'パスワードを忘れた方' })).toHaveAttribute('type', 'button');

    await user.type(screen.getByLabelText('メールアドレス'), 'member@example.com');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/login-passcodes', expect.objectContaining({
      body: JSON.stringify({ email_address: 'member@example.com' }),
      method: 'POST',
    }));
    expect(await screen.findByLabelText('ログインパスコード')).toBeInTheDocument();

    await user.type(screen.getByLabelText('ログインパスコード'), '123456');
    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    expect(fetchMock).toHaveBeenLastCalledWith('/api/login-passcodes/verification', expect.objectContaining({
      body: JSON.stringify({ passcode: '123456' }),
      method: 'POST',
    }));
  });
});
