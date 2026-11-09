import { useEffect, useSyncExternalStore } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthenticationStatus, restoreAuthentication, subscribeToAuthentication } from '../../auth/services/authSession';
import { RoutineFeedPage } from '../../routineFeed/pages/RoutineFeedPage';
import messages from '../../../shared/message/message.json';

export function InitialPage() {
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);

  useEffect(() => {
    if (authenticationStatus === 'loading') void restoreAuthentication();
  }, [authenticationStatus]);

  if (authenticationStatus === 'loading') return <p role="status">{messages.home.loading}</p>;
  return authenticationStatus === 'authenticated' ? <Navigate replace to="/home" /> : <RoutineFeedPage isAuthenticated={false} />;
}
