import { Alert, Button } from '@mui/material';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HibilioMark } from '../../../../shared/brand/HibilioMark';
import messages from '../../../../shared/message/message.json';
import { useAccountRegistration } from '../hooks/useAccountRegistration';
import { registrationSocialPlatforms, type RegistrationSocialPlatform } from '../services/registrationSocialPlatforms';
import './register.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const registration = useAccountRegistration(() => navigate('/login'));
  const [linkValue, setLinkValue] = useState('');
  const passcodeInputReferences = useRef<Array<HTMLInputElement | null>>([]);
  const [selectedSocialPlatform, setSelectedSocialPlatform] = useState<RegistrationSocialPlatform | null>(null);
  const passcodeDigits = Array.from({ length: 6 }, (_, index) => registration.passcode[index] ?? '');
  const stepIndex = registration.step === 'email' ? 0 : registration.step === 'passcode' ? 1 : registration.step === 'profile' ? 2 : 3;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (registration.step === 'email') {
      void registration.submitEmailAddress();
      return;
    }

    if (registration.step === 'passcode') {
      void registration.submitPasscode();
      return;
    }

    if (registration.step === 'profile') {
      registration.continueToSocialLinks();
      return;
    }

    void registration.submitSocialLinks();
  }

  function updatePasscodeDigit(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, '');
    const nextPasscode = `${registration.passcode.slice(0, index)}${digits}${registration.passcode.slice(index + digits.length)}`.slice(0, 6);
    registration.setPasscode(nextPasscode);

    if (digits !== '') {
      passcodeInputReferences.current[Math.min(index + Math.max(digits.length, 1), 5)]?.focus();
    }
  }

  function movePasscodeFocusOnBackspace(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && passcodeDigits[index] === '' && index > 0) {
      passcodeInputReferences.current[index - 1]?.focus();
    }
  }

  function addSocialLink() {
    if (selectedSocialPlatform === null || linkValue.trim() === '') {
      return;
    }

    registration.addSocialLink({ socialType: selectedSocialPlatform.socialType, socialUrl: `${selectedSocialPlatform.urlPrefix}${linkValue.trim()}` });
    setLinkValue('');
    setSelectedSocialPlatform(null);
  }

  return (
    <main className="hibilio-register">
      <header className="hibilio-register__header">
        <Button aria-label={messages.auth.backToLogin} className="hibilio-register__back" onClick={() => registration.step === 'email' ? navigate('/login') : registration.returnToEmailAddress()} type="button" variant="text">
          ←
        </Button>
        <h1>{messages.auth.signUpTitle}</h1>
        <div aria-label={messages.auth.signUpTitle} className="hibilio-register__steps">
          {[0, 1, 2].map((index) => <span className={stepIndex >= index ? 'is-active' : ''} key={index} />)}
        </div>
      </header>

      <section className="hibilio-register__content">
        <div className="hibilio-register__intro">
          <HibilioMark size={56} />
          <h2>{registration.step === 'email' ? messages.auth.accountCreationTitle : registration.step === 'passcode' ? messages.auth.registrationPasscodeTitle : registration.step === 'profile' ? messages.auth.profileSetupTitle : messages.auth.socialLinksTitle}</h2>
          <p>{registration.step === 'email' ? messages.auth.accountCreationStep : registration.step === 'passcode' ? messages.auth.registrationPasscodeStep : registration.step === 'profile' ? messages.auth.profileSetupStep : messages.auth.socialLinksStep}</p>
        </div>

        <form className="hibilio-register__form" noValidate onSubmit={handleSubmit}>
          {registration.errorMessage !== null && <Alert severity="error">{registration.errorMessage}</Alert>}

          {registration.step === 'email' && (
            <>
              <label className="hibilio-register__field">
                <span>{messages.auth.emailAddress}</span>
                <input autoComplete="email" onChange={(event) => registration.setEmailAddress(event.target.value)} placeholder={messages.auth.emailAddressPlaceholder} type="email" value={registration.emailAddress} />
              </label>
              <Button className="hibilio-register__submit" disabled={registration.isSubmitting || registration.emailAddress === ''} fullWidth size="large" type="submit" variant="contained">
                {messages.auth.requestPasscode}
              </Button>
              <div aria-hidden="true" className="hibilio-register__divider"><span>{messages.auth.or}</span></div>
              <div className="hibilio-register__providers">
                <Button className="hibilio-register__provider" fullWidth type="button" variant="outlined">{messages.auth.googleRegister}</Button>
                <Button className="hibilio-register__provider hibilio-register__provider--apple" fullWidth type="button" variant="contained">{messages.auth.appleRegister}</Button>
              </div>
            </>
          )}

          {registration.step === 'passcode' && (
            <>
              <p className="hibilio-register__passcode-description"><strong>{registration.emailAddress}</strong><br />{messages.auth.passcodeSentDescription}</p>
              <div aria-label={messages.auth.passcode} className="hibilio-register__passcode-inputs">
                {passcodeDigits.map((digit, index) => (
                  <input
                    aria-label={messages.auth.passcodeDigit.replace('{index}', String(index + 1))}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    inputMode="numeric"
                    key={index}
                    maxLength={6}
                    onChange={(event) => updatePasscodeDigit(index, event)}
                    onKeyDown={(event) => movePasscodeFocusOnBackspace(index, event)}
                    ref={(element) => { passcodeInputReferences.current[index] = element; }}
                    value={digit}
                  />
                ))}
              </div>
              <Button className="hibilio-register__submit" disabled={registration.isSubmitting || registration.passcode.length !== 6} fullWidth size="large" type="submit" variant="contained">
                {messages.auth.confirmAndContinue}
              </Button>
              <div className="hibilio-register__passcode-help">
                <p>{messages.auth.passcodeNotReceived}</p>
                <Button disabled={registration.isSubmitting} onClick={() => void registration.submitEmailAddress()} type="button" variant="text">{messages.auth.resendPasscode}</Button>
              </div>
              <Button className="hibilio-register__change-email" onClick={registration.returnToEmailAddress} type="button" variant="text">{messages.auth.changeEmailAddress}</Button>
            </>
          )}

          {registration.step === 'profile' && (
            <>
              <div className="hibilio-register__avatar" aria-hidden="true">
                <span>{registration.accountName === '' ? '?' : registration.accountName.slice(0, 1).toUpperCase()}</span>
                <i>＋</i>
              </div>
              <label className="hibilio-register__field">
                <span>{messages.auth.accountName}</span>
                <input autoComplete="name" maxLength={50} onChange={(event) => registration.setAccountName(event.target.value)} placeholder={messages.auth.accountNamePlaceholder} value={registration.accountName} />
              </label>
              <label className="hibilio-register__field">
                <span>{messages.auth.userHandle}</span>
                <span className="hibilio-register__handle-input"><b>@</b><input aria-label={messages.auth.userHandle} maxLength={20} onChange={(event) => registration.setUserHandle(event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())} placeholder={messages.auth.userHandlePlaceholder} value={registration.userHandle} /></span>
                <small>{messages.auth.userHandleHint}</small>
              </label>
              <label className="hibilio-register__field">
                <span>{messages.auth.profileBio}</span>
                <textarea maxLength={300} onChange={(event) => registration.setAccountBio(event.target.value)} placeholder={messages.auth.profileBioPlaceholder} rows={3} value={registration.accountBio} />
              </label>
              <Button className="hibilio-register__submit" disabled={registration.isSubmitting || registration.accountName === '' || registration.userHandle === ''} fullWidth size="large" type="submit" variant="contained">
                {messages.auth.profileNext}
              </Button>
            </>
          )}
          {registration.step === 'social' && (
            <>
              {selectedSocialPlatform === null ? (
                <div className="hibilio-register__social-platforms">
                  {registrationSocialPlatforms.map((platform) => <Button key={platform.socialType} onClick={() => setSelectedSocialPlatform(platform)} type="button" variant="outlined">{platform.label}</Button>)}
                </div>
              ) : (
                <div className="hibilio-register__social-add">
                  <input aria-label={messages.auth.socialLinkInput.replace('{platform}', selectedSocialPlatform.label)} onChange={(event) => setLinkValue(event.target.value)} placeholder={selectedSocialPlatform.placeholder} value={linkValue} />
                  <Button onClick={addSocialLink} type="button" variant="contained">{messages.auth.add}</Button>
                </div>
              )}
              <Button className="hibilio-register__submit" fullWidth size="large" type="submit" variant="contained">{messages.auth.profileStart}</Button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
