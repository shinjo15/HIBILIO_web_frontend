import { useNavigate } from 'react-router-dom';
import { useAppTheme } from '../../../app/appThemeContext';
import { logout } from '../../auth/services/authSession';
import { SettingsContent } from '../components/SettingsContent';
import { useSettings } from '../hooks/useSettings';
import '../settings.css';

export function SettingsPage() {
  const navigate = useNavigate();
  const { isUiModeLoading, isUiModeSaving, setUiMode, uiMode, uiModeError } = useAppTheme();
  const settings = useSettings();

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
      onUiModeChange={(nextUiMode) => void setUiMode(nextUiMode)}
      onToggleLikeNotification={settings.toggleLikeNotification}
      onTogglePrivateAccount={settings.togglePrivateAccount}
      onToggleSupportNotification={settings.toggleSupportNotification}
      onRetryPrivateAccount={settings.retryVisibility}
      privateAccountDisabled={settings.isVisibilityLoading || settings.isVisibilitySaving || settings.visibilityLoadError}
      settings={settings.settings}
      uiMode={uiMode}
      uiModeDisabled={isUiModeLoading || isUiModeSaving}
      uiModeError={uiModeError}
      visibilityError={settings.visibilityError}
    />
  );
}
