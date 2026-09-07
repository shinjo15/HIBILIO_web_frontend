import { useEffect, useState } from 'react';
import { AuthenticationApiError, createAccount, requestRegistrationPasscode, verifyRegistrationPasscode, type CreateAccountInput } from '../../services/authApi';
import { validateEmailAddress, validateLoginPasscode } from '../../services/authValidation';
import messages from '../../../../shared/message/message.json';
import { getPickupTags, type PickupTag } from '../services/pickupTagService';

type RegistrationStep = 'email' | 'passcode' | 'profile' | 'social' | 'tags';
type RegistrationSocialLink = CreateAccountInput['socialLinks'][number];

export function useAccountRegistration(onRegistered: () => void) {
  const [accountBio, setAccountBio] = useState('');
  const [accountName, setAccountName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [favoriteTagIdentifiers, setFavoriteTagIdentifiers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [pickupTags, setPickupTags] = useState<PickupTag[]>([]);
  const [socialLinks, setSocialLinks] = useState<RegistrationSocialLink[]>([]);
  const [step, setStep] = useState<RegistrationStep>('email');
  const [tagLoadError, setTagLoadError] = useState(false);
  const [userHandle, setUserHandle] = useState('');

  useEffect(() => {
    void getPickupTags().then(setPickupTags).catch(() => setTagLoadError(true));
  }, []);

  async function submitEmailAddress(): Promise<void> {
    const validation = validateEmailAddress(emailAddress);
    if (!validation.success) { setErrorMessage(validation.message); return; }
    setErrorMessage(null);
    setIsSubmitting(true);
    try { await requestRegistrationPasscode(emailAddress); setStep('passcode'); } catch (error) { setErrorMessage(error instanceof AuthenticationApiError ? error.message : messages.auth.accountRegistrationFailed); } finally { setIsSubmitting(false); }
  }

  async function submitPasscode(): Promise<void> {
    const validation = validateLoginPasscode(passcode);
    if (!validation.success) { setErrorMessage(validation.message); return; }
    setErrorMessage(null);
    setIsSubmitting(true);
    try { await verifyRegistrationPasscode(passcode); setStep('profile'); } catch (error) { setErrorMessage(error instanceof AuthenticationApiError ? error.message : messages.auth.accountRegistrationFailed); } finally { setIsSubmitting(false); }
  }

  function continueToSocialLinks(): void {
    if (accountName.trim() === '') { setErrorMessage(messages.auth.accountNameRequired); return; }
    if (userHandle.trim() === '') { setErrorMessage(messages.auth.userHandleRequired); return; }
    setErrorMessage(null);
    setStep('social');
  }

  function continueToTags(): void {
    setErrorMessage(null);
    setStep('tags');
  }

  async function submitFavoriteTags(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createAccount({ accountBio, accountName, favoriteTagIdentifiers, socialLinks });
      onRegistered();
    } catch (error) {
      setErrorMessage(error instanceof AuthenticationApiError ? error.message : messages.auth.accountRegistrationFailed);
    } finally { setIsSubmitting(false); }
  }

  function addSocialLink(socialLink: RegistrationSocialLink): void {
    setSocialLinks((current) => [...current.filter((item) => item.socialType !== socialLink.socialType), socialLink]);
  }

  function toggleFavoriteTag(identifier: string): void {
    setFavoriteTagIdentifiers((current) => current.includes(identifier)
      ? current.filter((currentIdentifier) => currentIdentifier !== identifier)
      : [...current, identifier]);
  }

  function returnToEmailAddress(): void { setErrorMessage(null); setPasscode(''); setStep('email'); }
  function returnToProfile(): void { setErrorMessage(null); setStep('profile'); }
  function returnToSocialLinks(): void { setErrorMessage(null); setStep('social'); }

  return { accountBio, accountName, addSocialLink, continueToSocialLinks, continueToTags, emailAddress, errorMessage, favoriteTagIdentifiers, isSubmitting, passcode, pickupTags, returnToEmailAddress, returnToProfile, returnToSocialLinks, setAccountBio, setAccountName, setEmailAddress, setPasscode, setUserHandle, socialLinks, step, submitEmailAddress, submitFavoriteTags, submitPasscode, tagLoadError, toggleFavoriteTag, userHandle };
}
