import { useNavigate } from 'react-router-dom';
import { useAppTheme } from '../../../app/appThemeContext';
import { SettingsContent } from '../components/SettingsContent';
import { useSettings } from '../hooks/useSettings';
import '../settings.css';

export function SettingsPage() {
  const navigate = useNavigate();
  const { setThemeMode } = useAppTheme();
  const settings = useSettings();

  function toggleDarkMode() {
    settings.toggleDarkMode();
    setThemeMode(settings.settings.isDarkMode ? 'light' : 'dark');
  }

  function signOut() {
    settings.signOut();
    navigate('/login');
  }

  return (
    <SettingsContent
      onBack={() => navigate('/account')}
      onSignOut={signOut}
      onToggleDarkMode={toggleDarkMode}
      onToggleLikeNotification={settings.toggleLikeNotification}
      onTogglePrivateAccount={settings.togglePrivateAccount}
      onToggleSupportNotification={settings.toggleSupportNotification}
      settings={settings.settings}
    />
  );
}
