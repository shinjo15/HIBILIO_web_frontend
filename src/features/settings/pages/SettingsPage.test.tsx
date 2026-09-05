import { useTheme } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppThemeProvider } from '../../../app/AppThemeProvider';
import { SettingsPage } from './SettingsPage';

function Location() {
  return <output>{useLocation().pathname}</output>;
}

function ThemeMode() {
  const theme = useTheme();
  return <output>{theme.palette.mode}</output>;
}

function renderPage() {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={['/account/settings']}>
        <SettingsPage />
        <Location />
        <ThemeMode />
      </MemoryRouter>
    </AppThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('hibilio-theme-dark');
});

describe('SettingsPage', () => {
  it('設定の各トグルをローカル状態として切り替える', async () => {
    const user = userEvent.setup();
    renderPage();

    const privateAccount = screen.getByRole('switch', { name: '鍵アカウント' });
    const likeNotification = screen.getByRole('switch', { name: 'いいね通知' });
    const supportNotification = screen.getByRole('switch', { name: '応援通知' });

    expect(privateAccount).toHaveAttribute('aria-checked', 'false');
    expect(likeNotification).toHaveAttribute('aria-checked', 'true');
    expect(supportNotification).toHaveAttribute('aria-checked', 'true');

    await user.click(privateAccount);
    await user.click(likeNotification);
    await user.click(supportNotification);

    expect(privateAccount).toHaveAttribute('aria-checked', 'true');
    expect(likeNotification).toHaveAttribute('aria-checked', 'false');
    expect(supportNotification).toHaveAttribute('aria-checked', 'false');
  });

  it('ダークモードで CSS トークンと MUI テーマを切り替える', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('switch', { name: 'ダークモード' }));

    expect(document.documentElement).toHaveClass('hibilio-theme-dark');
    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('戻る操作とローカルのログアウト操作で遷移する', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'アカウントに戻る' }));
    expect(screen.getByText('/account')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(screen.getByText('/login')).toBeInTheDocument();
  });

  it('対象外のアプリアイコン画面への導線を表示しない', () => {
    renderPage();

    expect(screen.queryByText('アプリアイコン')).not.toBeInTheDocument();
  });
});
