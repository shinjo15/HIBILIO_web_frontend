import messages from '../../../shared/message/message.json';

type AccountBackButtonProps = {
  onBack?: () => void;
};

export function AccountBackButton({ onBack }: AccountBackButtonProps) {
  return <button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button"><BackIcon /><span>{messages.publicAccount.back}</span></button>;
}

function BackIcon() {
  return <svg aria-hidden="true" className="account-page__back-icon" fill="none" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
