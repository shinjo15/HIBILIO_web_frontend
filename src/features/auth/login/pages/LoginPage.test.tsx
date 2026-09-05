import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage';

afterEach(() => cleanup());

describe('LoginPage', () => {
  it('モック準拠のログイン入力と未接続の認証ボタンを表示する', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'HIBILIO' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'ログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Googleでログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Appleでログイン' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'パスワードを忘れた方' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument();
  });
});
