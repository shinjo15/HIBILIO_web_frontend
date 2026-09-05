import { Alert, Button, TextField } from '@mui/material';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginPasscode } from '../hooks/useLoginPasscode';
import messages from '../../../../shared/message/message.json';
import './login.css';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLoginPasscode(() => navigate('/'));
  const isEmailStep = login.step === 'email';
  const fieldLabel = isEmailStep ? messages.auth.emailAddress : messages.auth.passcode;
  const description = isEmailStep ? messages.auth.loginDescription : messages.auth.passcodeDescription;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void (isEmailStep ? login.submitEmailAddress() : login.submitPasscode());
  }

  return (
    <main className="hibilio-login">
      <section aria-labelledby="hibilio-login-brand" className="hibilio-login__content">
        <header className="hibilio-login__brand">
          <h1 id="hibilio-login-brand">{messages.app.name}</h1>
          <p>{messages.app.tagline}</p>
        </header>

        <form className="hibilio-login__form" noValidate onSubmit={handleSubmit}>
          <p className="hibilio-login__description">{description}</p>
          {login.errorMessage !== null && (
            <Alert className="hibilio-login__error" severity="error">
              {login.errorMessage}
            </Alert>
          )}
          <TextField
            autoComplete={isEmailStep ? 'email' : 'one-time-code'}
            autoFocus
            className="hibilio-login__field"
            label={fieldLabel}
            onChange={(event) => (isEmailStep ? login.setEmailAddress(event.target.value) : login.setPasscode(event.target.value))}
            placeholder={isEmailStep ? messages.auth.emailAddressPlaceholder : messages.auth.passcodePlaceholder}
            slotProps={isEmailStep ? undefined : {
              htmlInput: {
                inputMode: 'numeric',
                maxLength: 6,
                pattern: '[0-9]*',
              },
            }}
            type={isEmailStep ? 'email' : 'text'}
            value={isEmailStep ? login.emailAddress : login.passcode}
          />
          {isEmailStep && (
            <>
              <TextField
                autoComplete="current-password"
                className="hibilio-login__field"
                label={messages.auth.password}
                placeholder={messages.auth.passwordPlaceholder}
                type="password"
              />
              <Button className="hibilio-login__submit" fullWidth size="large" type="button" variant="contained">
                {messages.auth.login}
              </Button>
              <div aria-hidden="true" className="hibilio-login__divider">
                <span>{messages.auth.or}</span>
              </div>
              <div className="hibilio-login__providers">
                <Button className="hibilio-login__provider hibilio-login__provider--google" fullWidth type="button" variant="outlined">
                  {messages.auth.googleLogin}
                </Button>
                <Button className="hibilio-login__provider hibilio-login__provider--apple" fullWidth type="button" variant="contained">
                  {messages.auth.appleLogin}
                </Button>
              </div>
              <Button className="hibilio-login__forgot-password" type="button" variant="text">
                {messages.auth.forgotPassword}
              </Button>
            </>
          )}
          <Button className="hibilio-login__passcode-submit" disabled={login.isSubmitting} fullWidth size="large" type="submit" variant="outlined">
            {isEmailStep ? messages.auth.requestPasscode : messages.auth.submitPasscode}
          </Button>
          {isEmailStep ? (
            <div className="hibilio-login__sign-up">
              <span>{messages.auth.signUpPrompt}</span>
              <Button className="hibilio-login__sign-up-link" onClick={() => navigate('/sign-up')} variant="text">
                {messages.auth.signUp}
              </Button>
            </div>
          ) : (
            <Button className="hibilio-login__edit-email" onClick={login.returnToEmailAddress} variant="text">
              {messages.auth.sendAgain}
            </Button>
          )}
        </form>
      </section>
    </main>
  );
}
