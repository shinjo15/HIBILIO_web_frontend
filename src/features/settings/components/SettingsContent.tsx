import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import type { ReactNode } from 'react';
import type { UiMode } from '../../../app/uiModeService';
import type { Settings } from '../domain/settings';
import messages from '../../../shared/message/message.json';

type SettingsContentProps = {
  onBack: () => void;
  onContactSupport: () => void;
  onSignOut: () => void;
  onUiModeChange: (uiMode: UiMode) => void;
  onToggleLikeNotification: () => void;
  onTogglePrivateAccount: () => void;
  onToggleSupportNotification: () => void;
  onRetryPrivateAccount: () => void;
  privateAccountDisabled: boolean;
  settings: Settings;
  uiMode: UiMode;
  uiModeDisabled: boolean;
  uiModeError: boolean;
  visibilityError: boolean;
};

type SettingToggleRowProps = {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: () => void;
  disabled?: boolean;
};

export function SettingsContent({
  onBack,
  onContactSupport,
  onSignOut,
  onUiModeChange,
  onToggleLikeNotification,
  onTogglePrivateAccount,
  onToggleSupportNotification,
  onRetryPrivateAccount,
  privateAccountDisabled,
  settings,
  uiMode,
  uiModeDisabled,
  uiModeError,
  visibilityError,
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
          <UiModeRow disabled={uiModeDisabled} onChange={onUiModeChange} uiMode={uiMode} />
          {uiModeError && <div className="settings-visibility-error" role="alert">{messages.settings.uiModeError}</div>}
        </SettingsSection>
        <SettingsSection title={messages.settings.sections.privacy}>
          <SettingToggleRow checked={settings.isPrivateAccount} disabled={privateAccountDisabled} icon={<LockOutlinedIcon fontSize="small" />} label={messages.settings.privateAccount} onChange={onTogglePrivateAccount} />
          {visibilityError && <div className="settings-visibility-error" role="alert"><span>{messages.settings.visibilityError}</span><button onClick={onRetryPrivateAccount} type="button">{messages.settings.retry}</button></div>}
        </SettingsSection>
        <SettingsSection title={messages.settings.sections.notifications}>
          <SettingToggleRow checked={settings.isLikeNotificationEnabled} icon={<NotificationsOutlinedIcon fontSize="small" />} label={messages.settings.likeNotification} onChange={onToggleLikeNotification} />
          <SettingToggleRow checked={settings.isSupportNotificationEnabled} icon={<NotificationsOutlinedIcon fontSize="small" />} label={messages.settings.supportNotification} onChange={onToggleSupportNotification} />
        </SettingsSection>
        <div className="settings-page__sign-out-section">
          <button className="settings-page__contact-support" onClick={onContactSupport} type="button">
            <SupportAgentOutlinedIcon fontSize="small" />
            {messages.settings.contactSupport}
          </button>
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

function UiModeRow({ disabled, onChange, uiMode }: { disabled: boolean; onChange: (uiMode: UiMode) => void; uiMode: UiMode }) {
  const options: Array<{ label: string; value: UiMode }> = [
    { label: messages.settings.uiModeSystem, value: 'system' },
    { label: messages.settings.uiModeLight, value: 'light' },
    { label: messages.settings.uiModeDark, value: 'dark' },
  ];

  return (
    <div className="settings-toggle-row settings-ui-mode-row">
      <div className="settings-toggle-row__label">
        <span aria-hidden="true" className="settings-toggle-row__icon"><DarkModeOutlinedIcon fontSize="small" /></span>
        <span>{messages.settings.uiMode}</span>
      </div>
      <div aria-label={messages.settings.uiMode} className="settings-ui-mode-options" role="radiogroup">
        {options.map((option) => (
          <button aria-checked={uiMode === option.value} className={uiMode === option.value ? 'settings-ui-mode-option settings-ui-mode-option--selected' : 'settings-ui-mode-option'} disabled={disabled} key={option.value} onClick={() => onChange(option.value)} role="radio" type="button">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingToggleRow({ checked, disabled = false, icon, label, onChange }: SettingToggleRowProps) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-row__label">
        <span aria-hidden="true" className="settings-toggle-row__icon">{icon}</span>
        <span>{label}</span>
      </div>
      <button aria-checked={checked} aria-label={label} className={checked ? 'settings-toggle settings-toggle--checked' : 'settings-toggle'} disabled={disabled} onClick={onChange} role="switch" type="button">
        <span className="settings-toggle__thumb" />
      </button>
    </div>
  );
}
