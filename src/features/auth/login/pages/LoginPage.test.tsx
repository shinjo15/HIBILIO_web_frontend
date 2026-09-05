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
  it('モック準拠のブランド見出しと既存パスコード認証への導線を表示する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'ログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Googleでログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Appleでログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'パスワードを忘れた方' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'パスコードを送信' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('メールアドレス'), 'member@example.com');
    await user.click(screen.getByRole('button', { name: 'パスコードを送信' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/login-passcodes', expect.objectContaining({
      body: JSON.stringify({ email_address: 'member@example.com' }),
      method: 'POST',
    }));
    expect(await screen.findByLabelText('ログインパスコード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインする' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'メールアドレスを変更する' }));

    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
  });
});
