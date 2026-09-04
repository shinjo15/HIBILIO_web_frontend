import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthPageFrame, AuthSubmitButton, AuthTextField } from '../../shared/components/AuthPageFrame';
import { useLoginPasscode } from '../hooks/useLoginPasscode';
import messages from '../../../../shared/message/message.json';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLoginPasscode(() => navigate('/'));
  const isEmailStep = login.step === 'email';

  return (
    <AuthPageFrame
      description={isEmailStep ? messages.auth.loginDescription : messages.auth.passcodeDescription}
      errorMessage={login.errorMessage}
      title={messages.auth.loginTitle}
    >
      <Stack component="form" noValidate onSubmit={(event) => { event.preventDefault(); void (isEmailStep ? login.submitEmailAddress() : login.submitPasscode()); }} spacing={2}>
        {isEmailStep ? (
          <AuthTextField
            autoComplete="email"
            autoFocus
            label={messages.auth.emailAddress}
            onChange={(event) => login.setEmailAddress(event.target.value)}
            placeholder={messages.auth.emailAddressPlaceholder}
            type="email"
            value={login.emailAddress}
          />
        ) : (
          <AuthTextField
            autoComplete="one-time-code"
            autoFocus
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                maxLength: 6,
                pattern: '[0-9]*',
              },
            }}
            label={messages.auth.passcode}
            onChange={(event) => login.setPasscode(event.target.value)}
            placeholder={messages.auth.passcodePlaceholder}
            value={login.passcode}
          />
        )}
        <AuthSubmitButton disabled={login.isSubmitting} type="submit">
          {isEmailStep ? messages.auth.requestPasscode : messages.auth.submitPasscode}
        </AuthSubmitButton>
        {isEmailStep ? (
          <Button onClick={() => navigate('/sign-up')} variant="text">
            {messages.auth.signUpPrompt}：{messages.auth.signUp}
          </Button>
        ) : (
          <Button onClick={() => login.setPasscode('')} variant="text">
            {messages.auth.sendAgain}
          </Button>
        )}
      </Stack>
    </AuthPageFrame>
  );
}
