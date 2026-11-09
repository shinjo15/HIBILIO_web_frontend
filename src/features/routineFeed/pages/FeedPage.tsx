import { useEffect, useSyncExternalStore } from 'react';
import { getAuthenticationStatus, restoreAuthentication, subscribeToAuthentication } from '../../auth/services/authSession';
import messages from '../../../shared/message/message.json';
import { RoutineFeedPage } from './RoutineFeedPage';

export function FeedPage() {
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);

  useEffect(() => {
    if (authenticationStatus === 'loading') void restoreAuthentication();
  }, [authenticationStatus]);

  if (authenticationStatus === 'loading') return <p role="status">{messages.home.loading}</p>;
  return <RoutineFeedPage isAuthenticated={authenticationStatus === 'authenticated'} />;
}
