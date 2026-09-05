import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import messages from '../../../../shared/message/message.json';
import './login.css';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285f4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34a853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fbbc05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ea4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.29.06 2.18.73 2.95.74 1.12-.23 2.2-.92 3.37-.82 1.42.14 2.49.69 3.19 1.73-2.87 1.74-2.18 5.64.4 6.79-.39 1.16-.97 2.32-1.91 3.42zM13 3.5c.13 1.97-1.49 3.5-3.5 3.5C9.14 4.98 10.97 3 13 3.5z" fill="currentColor" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <main className="hibilio-login">
      <section aria-labelledby="hibilio-login-brand" className="hibilio-login__content">
        <header className="hibilio-login__brand">
          <h1 id="hibilio-login-brand">{messages.app.name}</h1>
          <p>{messages.app.tagline}</p>
        </header>

        <div className="hibilio-login__credentials">
          <label className="hibilio-login__field">
            <span>{messages.auth.emailAddress}</span>
            <input autoComplete="email" placeholder={messages.auth.emailAddressPlaceholder} type="email" />
          </label>
          <label className="hibilio-login__field">
            <span>{messages.auth.password}</span>
            <input autoComplete="current-password" placeholder={messages.auth.passwordPlaceholder} type="password" />
          </label>
        </div>

        <Button className="hibilio-login__submit" fullWidth size="large" type="button" variant="contained">
          {messages.auth.login}
        </Button>

        <div aria-hidden="true" className="hibilio-login__divider">
          <span>{messages.auth.or}</span>
        </div>

        <div className="hibilio-login__providers">
          <Button className="hibilio-login__provider hibilio-login__provider--google" fullWidth startIcon={<GoogleIcon />} type="button" variant="outlined">
            {messages.auth.googleLogin}
          </Button>
          <Button className="hibilio-login__provider hibilio-login__provider--apple" fullWidth startIcon={<AppleIcon />} type="button" variant="contained">
            {messages.auth.appleLogin}
          </Button>
        </div>

        <footer className="hibilio-login__footer">
          <Button className="hibilio-login__forgot-password" type="button" variant="text">
            {messages.auth.forgotPassword}
          </Button>
          <div className="hibilio-login__sign-up">
            <span>{messages.auth.signUpPrompt}</span>
            <Button className="hibilio-login__sign-up-link" onClick={() => navigate('/sign-up')} variant="text">
              {messages.auth.signUp}
            </Button>
          </div>
        </footer>
      </section>
    </main>
  );
}
