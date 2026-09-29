import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useSyncExternalStore } from 'react';
import { getAuthenticationStatus, restoreAuthentication, subscribeToAuthentication } from '../services/authSession';
import messages from '../../../shared/message/message.json';

export function RequireAuthentication() {
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);

  useEffect(() => {
    if (authenticationStatus === 'loading') void restoreAuthentication();
  }, [authenticationStatus]);

  if (authenticationStatus === 'loading') return <p aria-live="polite" role="status">{messages.account.loading}</p>;

  return authenticationStatus === 'authenticated' ? <Outlet /> : <Navigate replace to="/login" />;
}