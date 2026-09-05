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
  it('メールアドレスからパスコードを送信し、モック準拠の6桁入力画面で照合する', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('type', 'email');
    expect(screen.getByRole('button', { name: 'パスコードを送信' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Googleでログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Appleでログイン' })).toHaveAttribute('type', 'button');

    await user.type(screen.getByLabelText('メールアドレス'), 'member@example.com');
    await user.click(screen.getByRole('button', { name: 'パスコードを送信' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/login-passcodes', expect.objectContaining({
      body: JSON.stringify({ email_address: 'member@example.com' }),
      method: 'POST',
    }));
    expect(await screen.findByRole('heading', { name: 'パスコードを入力' })).toBeInTheDocument();
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeDisabled();

    await user.type(screen.getByLabelText('パスコード 1桁目'), '123456');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(fetchMock).toHaveBeenLastCalledWith('/api/login-passcodes/verification', expect.objectContaining({
      body: JSON.stringify({ passcode: '123456' }),
      method: 'POST',
    }));
  });
});
