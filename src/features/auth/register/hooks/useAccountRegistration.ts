import { useState } from 'react';
import { AuthenticationApiError, createAccount } from '../../services/authApi';
import { validateEmailAddress, validateLoginPasscode } from '../../services/authValidation';
import messages from '../../../../shared/message/message.json';
import { requestRegistrationPasscode, verifyRegistrationPasscode } from '../services/registrationPasscodeDummyAdapter';

type RegistrationStep = 'email' | 'passcode' | 'profile';

export function useAccountRegistration(onRegistered: () => void) {
  const [accountBio, setAccountBio] = useState('');
  const [accountName, setAccountName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [step, setStep] = useState<RegistrationStep>('email');
  const [userHandle, setUserHandle] = useState('');

  async function submitEmailAddress(): Promise<void> {
    const validation = validateEmailAddress(emailAddress);

    if (!validation.success) {
      setErrorMessage(validation.message);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await requestRegistrationPasscode();
      setStep('passcode');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPasscode(): Promise<void> {
    const validation = validateLoginPasscode(passcode);

    if (!validation.success) {
      setErrorMessage(validation.message);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await verifyRegistrationPasscode();
      setStep('profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProfile(): Promise<void> {
    if (accountName.trim() === '') {
      setErrorMessage(messages.auth.accountNameRequired);
      return;
    }

    if (userHandle.trim() === '') {
      setErrorMessage(messages.auth.userHandleRequired);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await createAccount({
        accountBio,
        accountName,
        emailAddress,
      });
      onRegistered();
    } catch (error) {
      setErrorMessage(error instanceof AuthenticationApiError ? error.message : messages.auth.accountRegistrationFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  function returnToEmailAddress(): void {
    setErrorMessage(null);
    setPasscode('');
    setStep('email');
  }

  return {
    accountBio,
    accountName,
    emailAddress,
    errorMessage,
    isSubmitting,
    passcode,
    returnToEmailAddress,
    setAccountBio,
    setAccountName,
    setEmailAddress,
    setPasscode,
    setUserHandle,
    step,
    submitEmailAddress,
    submitPasscode,
    submitProfile,
    userHandle,
  };
}
