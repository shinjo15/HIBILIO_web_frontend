import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthPageFrame, AuthSubmitButton, AuthTextField } from '../../shared/components/AuthPageFrame';
import { useAccountRegistration } from '../hooks/useAccountRegistration';
import messages from '../../../../shared/message/message.json';

export function RegisterPage() {
  const navigate = useNavigate();
  const registration = useAccountRegistration(() => navigate('/login'));

  return (
    <AuthPageFrame
      description={messages.auth.signUpDescription}
      errorMessage={registration.errorMessage}
      title={messages.auth.signUpTitle}
    >
      <Stack component="form" noValidate onSubmit={(event) => { event.preventDefault(); void registration.submit(); }} spacing={2}>
        <AuthTextField
          autoComplete="name"
          autoFocus
          label={messages.auth.accountName}
          onChange={(event) => registration.setAccountName(event.target.value)}
          placeholder={messages.auth.accountNamePlaceholder}
          value={registration.accountName}
        />
        <AuthTextField
          autoComplete="email"
          label={messages.auth.emailAddress}
          onChange={(event) => registration.setEmailAddress(event.target.value)}
          placeholder={messages.auth.emailAddressPlaceholder}
          type="email"
          value={registration.emailAddress}
        />
        <AuthSubmitButton disabled={registration.isSubmitting} type="submit">
          {messages.auth.signUp}
        </AuthSubmitButton>
        <Button onClick={() => navigate('/login')} variant="text">
          {messages.auth.backToLogin}
        </Button>
      </Stack>
    </AuthPageFrame>
  );
}
