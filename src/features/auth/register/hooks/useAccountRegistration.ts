import { useState } from 'react';
import { AuthenticationApiError, createAccount, type CreateAccountInput } from '../../services/authApi';
import { validateEmailAddress, validateLoginPasscode } from '../../services/authValidation';
import messages from '../../../../shared/message/message.json';
import { requestRegistrationPasscode, verifyRegistrationPasscode } from '../services/registrationPasscodeDummyAdapter';

type RegistrationStep = 'email' | 'passcode' | 'profile' | 'social';
type RegistrationSocialLink = CreateAccountInput['socialLinks'][number];

export function useAccountRegistration(onRegistered: () => void) {
  const [accountBio, setAccountBio] = useState('');
  const [accountName, setAccountName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [socialLinks, setSocialLinks] = useState<RegistrationSocialLink[]>([]);
  const [step, setStep] = useState<RegistrationStep>('email');
  const [userHandle, setUserHandle] = useState('');

  async function submitEmailAddress(): Promise<void> {
    const validation = validateEmailAddress(emailAddress);
    if (!validation.success) { setErrorMessage(validation.message); return; }
    setErrorMessage(null);
    setIsSubmitting(true);
    try { await requestRegistrationPasscode(); setStep('passcode'); } finally { setIsSubmitting(false); }
  }

  async function submitPasscode(): Promise<void> {
    const validation = validateLoginPasscode(passcode);
    if (!validation.success) { setErrorMessage(validation.message); return; }
    setErrorMessage(null);
    setIsSubmitting(true);
    try { await verifyRegistrationPasscode(); setStep('profile'); } finally { setIsSubmitting(false); }
  }

  function continueToSocialLinks(): void {
    if (accountName.trim() === '') { setErrorMessage(messages.auth.accountNameRequired); return; }
    if (userHandle.trim() === '') { setErrorMessage(messages.auth.userHandleRequired); return; }
    setErrorMessage(null);
    setStep('social');
  }

  async function submitSocialLinks(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createAccount({ accountBio, accountName, emailAddress, socialLinks });
      onRegistered();
    } catch (error) {
      setErrorMessage(error instanceof AuthenticationApiError ? error.message : messages.auth.accountRegistrationFailed);
    } finally { setIsSubmitting(false); }
  }

  function addSocialLink(socialLink: RegistrationSocialLink): void {
    setSocialLinks((current) => [...current.filter((item) => item.socialType !== socialLink.socialType), socialLink]);
  }

  function removeSocialLink(socialType: RegistrationSocialLink['socialType']): void {
    setSocialLinks((current) => current.filter((socialLink) => socialLink.socialType !== socialType));
  }

  function returnToEmailAddress(): void { setErrorMessage(null); setPasscode(''); setStep('email'); }
  function returnToProfile(): void { setErrorMessage(null); setStep('profile'); }

  return { accountBio, accountName, addSocialLink, continueToSocialLinks, emailAddress, errorMessage, isSubmitting, passcode, removeSocialLink, returnToEmailAddress, returnToProfile, setAccountBio, setAccountName, setEmailAddress, setPasscode, setUserHandle, socialLinks, step, submitEmailAddress, submitPasscode, submitSocialLinks, userHandle };
}
