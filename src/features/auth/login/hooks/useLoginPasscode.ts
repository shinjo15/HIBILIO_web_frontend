import { useState } from 'react';
import { AuthenticationApiError, requestLoginPasscode, verifyLoginPasscode } from '../../services/authApi';
import { validateEmailAddress, validateLoginPasscode } from '../../services/authValidation';

export function useLoginPasscode(onAuthenticated: () => void) {
  const [emailAddress, setEmailAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [step, setStep] = useState<'email' | 'passcode'>('email');

  async function submitEmailAddress(): Promise<void> {
    const validation = validateEmailAddress(emailAddress);

    if (!validation.success) {
      setErrorMessage(validation.message);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await requestLoginPasscode(emailAddress);
      setStep('passcode');
    } catch (error) {
      setErrorMessage(error instanceof AuthenticationApiError ? error.message : '通信に失敗しました。時間をおいて再度お試しください。');
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
      await verifyLoginPasscode(passcode);
      onAuthenticated();
    } catch (error) {
      setErrorMessage(error instanceof AuthenticationApiError ? error.message : 'ログインに失敗しました。パスコードを確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    emailAddress,
    errorMessage,
    isSubmitting,
    passcode,
    setEmailAddress,
    setPasscode,
    step,
    submitEmailAddress,
    submitPasscode,
  };
}
