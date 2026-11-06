import { useNavigate } from 'react-router-dom';
import { useAppTheme } from '../../../app/appThemeContext';
import { logout } from '../../auth/services/authSession';
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

  async function signOut() {
    try {
      await logout();
    } catch {
      return;
    }

    settings.signOut();
    navigate('/login');
  }

  return (
    <SettingsContent
      onBack={() => navigate('/account')}
      onContactSupport={() => navigate('/contact-support')}
      onSignOut={() => void signOut()}
      onToggleDarkMode={toggleDarkMode}
      onToggleLikeNotification={settings.toggleLikeNotification}
      onTogglePrivateAccount={settings.togglePrivateAccount}
      onToggleSupportNotification={settings.toggleSupportNotification}
      onRetryPrivateAccount={settings.retryVisibility}
      privateAccountDisabled={settings.isVisibilityLoading || settings.isVisibilitySaving || settings.visibilityLoadError}
      settings={settings.settings}
      visibilityError={settings.visibilityError}
    />
  );
}
