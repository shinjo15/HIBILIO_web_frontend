import { useState } from 'react';
import { AuthenticationApiError, createAccount } from '../../services/authApi';
import { validateEmailAddress } from '../../services/authValidation';

export function useAccountRegistration(onRegistered: () => void) {
  const [accountName, setAccountName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(): Promise<void> {
    const emailValidation = validateEmailAddress(emailAddress);

    if (!emailValidation.success) {
      setErrorMessage(emailValidation.message);
      return;
    }

    if (accountName.trim() === '') {
      setErrorMessage('アカウント名を入力してください。');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await createAccount(accountName, emailAddress);
      onRegistered();
    } catch (error) {
      setErrorMessage(error instanceof AuthenticationApiError ? error.message : 'アカウント登録に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    accountName,
    emailAddress,
    errorMessage,
    isSubmitting,
    setAccountName,
    setEmailAddress,
    submit,
  };
}
