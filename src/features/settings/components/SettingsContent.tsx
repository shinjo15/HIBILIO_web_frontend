import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import type { ReactNode } from 'react';
import type { Settings } from '../domain/settings';
import messages from '../../../shared/message/message.json';

type SettingsContentProps = {
  onBack: () => void;
  onSignOut: () => void;
  onToggleDarkMode: () => void;
  onToggleLikeNotification: () => void;
  onTogglePrivateAccount: () => void;
  onToggleSupportNotification: () => void;
  settings: Settings;
};

type SettingToggleRowProps = {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: () => void;
};

export function SettingsContent({
  onBack,
  onSignOut,
  onToggleDarkMode,
  onToggleLikeNotification,
  onTogglePrivateAccount,
  onToggleSupportNotification,
  settings,
}: SettingsContentProps) {
  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <button aria-label={messages.settings.backToAccount} className="settings-page__back" onClick={onBack} type="button">
          <ArrowBackOutlinedIcon fontSize="small" />
        </button>
        <h1 className="settings-page__title">{messages.settings.title}</h1>
      </header>

      <div className="settings-page__content">
        <SettingsSection title={messages.settings.sections.display}>
          <SettingToggleRow checked={settings.isDarkMode} icon={<DarkModeOutlinedIcon fontSize="small" />} label={messages.settings.darkMode} onChange={onToggleDarkMode} />
        </SettingsSection>
        <SettingsSection title={messages.settings.sections.privacy}>
          <SettingToggleRow checked={settings.isPrivateAccount} icon={<LockOutlinedIcon fontSize="small" />} label={messages.settings.privateAccount} onChange={onTogglePrivateAccount} />
        </SettingsSection>
        <SettingsSection title={messages.settings.sections.notifications}>
          <SettingToggleRow checked={settings.isLikeNotificationEnabled} icon={<NotificationsOutlinedIcon fontSize="small" />} label={messages.settings.likeNotification} onChange={onToggleLikeNotification} />
          <SettingToggleRow checked={settings.isSupportNotificationEnabled} icon={<NotificationsOutlinedIcon fontSize="small" />} label={messages.settings.supportNotification} onChange={onToggleSupportNotification} />
        </SettingsSection>
        <div className="settings-page__sign-out-section">
          <button className="settings-page__sign-out" onClick={onSignOut} type="button">
            <LogoutOutlinedIcon fontSize="small" />
            {messages.settings.signOut}
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingsSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{title}</h2>
      <div className="settings-section__rows">{children}</div>
    </section>
  );
}

function SettingToggleRow({ checked, icon, label, onChange }: SettingToggleRowProps) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-row__label">
        <span aria-hidden="true" className="settings-toggle-row__icon">{icon}</span>
        <span>{label}</span>
      </div>
      <button aria-checked={checked} aria-label={label} className={checked ? 'settings-toggle settings-toggle--checked' : 'settings-toggle'} onClick={onChange} role="switch" type="button">
        <span className="settings-toggle__thumb" />
      </button>
    </div>
  );
}
