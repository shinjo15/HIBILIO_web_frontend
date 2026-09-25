import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountService as defaultCurrentAccountService, AccountUnauthorizedError, type AccountService } from '../services/accountService';
import { publicAccountService, type PrivateAccountProfile, type PublicAccountProfile, type PublicAccountService } from '../services/publicAccountService';

import { AccountPage } from './AccountPage';
import { accountBlockService, type AccountBlockService } from '../services/accountBlockService';
import { accountFollowService, AccountFollowError, AccountFollowUnauthorizedError, type AccountFollowService } from '../services/accountFollowService';
import messages from '../../../shared/message/message.json';
import { clearAuthenticated } from '../../auth/services/authSession';

type PublicAccountPageProps = { blockService?: AccountBlockService; currentAccountService?: Pick<AccountService, 'getProfile'>; followService?: AccountFollowService; service?: PublicAccountService };

export function PublicAccountPage({ blockService = accountBlockService, currentAccountService = defaultCurrentAccountService, followService = accountFollowService, service = publicAccountService }: PublicAccountPageProps) {
  const navigate = useNavigate();
  const { accountId = '' } = useParams<{ accountId: string }>();
  const [currentAccountIdentifier, setCurrentAccountIdentifier] = useState<string | null | undefined>(undefined);
  const [profileErrorAccountId, setProfileErrorAccountId] = useState<string | null>(null);
  const [loadedProfile, setLoadedProfile] = useState<{ accountId: string; profile: PublicAccountProfile | null } | undefined>(undefined);
  const accountService = useMemo<AccountService>(() => ({
    getExecutionHistory: async () => null,
    getProfile: async () => {
      const profile = loadedProfile?.accountId === accountId ? loadedProfile.profile : null;
      return profile !== null && 'hasPendingFollowRequest' in profile ? null : profile;
    },
    listExecutionHistories: async () => service.listExecutionHistories(accountId),
    listExecutionHistoriesPage: service.listExecutionHistoriesPage === undefined ? undefined : async (page) => service.listExecutionHistoriesPage?.(accountId, page) ?? { items: [], total: 0 },
    listBlockedAccounts: async () => [],
    listReceivedFollowRequests: async () => [],

    listLikes: async () => service.listLikes(accountId),
    listLikesPage: service.listLikesPage === undefined ? undefined : async (page) => service.listLikesPage?.(accountId, page) ?? { items: [], total: 0 },
    listPosts: async () => service.listPosts(accountId),
    listPostsPage: service.listPostsPage === undefined ? undefined : async (page) => service.listPostsPage?.(accountId, page) ?? { items: [], total: 0 },
  }), [accountId, loadedProfile, service]);

  useEffect(() => {
    let cancelled = false;
    currentAccountService.getProfile().then((profile) => {
      if (!cancelled) setCurrentAccountIdentifier(profile?.accountIdentifier ?? null);
    }).catch((error: unknown) => {
      if (!cancelled && error instanceof AccountUnauthorizedError) setCurrentAccountIdentifier(null);
    });
    return () => { cancelled = true; };
  }, [currentAccountService]);

  useEffect(() => {
    let cancelled = false;
    service.get(accountId).then((profile) => {
      if (!cancelled) {
        setProfileErrorAccountId(null);
        setLoadedProfile({ accountId, profile });
      }
    }).catch(() => {
      if (!cancelled) setProfileErrorAccountId(accountId);
    });
    return () => { cancelled = true; };
  }, [accountId, service]);

  function reloadProfile(profile: PublicAccountProfile | null) {
    setLoadedProfile({ accountId, profile });
  }

  if (profileErrorAccountId === accountId) return <section className="account-page"><header className="account-page__header account-page__header--public"><button aria-label={messages.publicAccount.back} className="account-page__back" onClick={() => navigate(-1)} type="button">← {messages.publicAccount.back}</button></header><p className="account-page__state account-page__state--error">{messages.account.error}</p></section>;
  if (loadedProfile === undefined || loadedProfile.accountId !== accountId) return <p className="account-page__state account-page__state--loading">{messages.publicAccount.loading}</p>;
  if (loadedProfile.profile !== null && 'hasPendingFollowRequest' in loadedProfile.profile) return <PrivateAccountPage followService={followService} onBack={() => navigate(-1)} onProfileReload={reloadProfile} profile={loadedProfile.profile} service={service} />;

  return <AccountPage blockService={blockService} currentAccountIdentifier={currentAccountIdentifier} followService={followService} isInitiallyFollowed={loadedProfile.profile?.isFollowing === true} isOwnAccount={false} key={accountId} notFoundMessage={messages.publicAccount.notFound} onBack={() => navigate(-1)} service={accountService} showPublicActions={currentAccountIdentifier !== undefined && currentAccountIdentifier !== accountId} />;
}

function PrivateAccountPage({ followService, onBack, onProfileReload, profile, service }: { followService: AccountFollowService; onBack: () => void; onProfileReload: (profile: PublicAccountProfile | null) => void; profile: PrivateAccountProfile; service: PublicAccountService }) {
  const navigate = useNavigate();
  const [hasPendingFollowRequest, setHasPendingFollowRequest] = useState(profile.hasPendingFollowRequest);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequestError, setHasRequestError] = useState(false);

  async function requestFollow() {
    if (hasPendingFollowRequest || isRequesting) return;
    setIsRequesting(true);
    setHasRequestError(false);
    try {
      await followService.create(profile.accountIdentifier);
      setHasPendingFollowRequest(true);
    } catch (error) {
      if (error instanceof AccountFollowUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else if (error instanceof AccountFollowError && error.status === 409) {
        try {
          const reloadedProfile = await service.get(profile.accountIdentifier);
          if (reloadedProfile !== null && 'hasPendingFollowRequest' in reloadedProfile) {
            if (reloadedProfile.hasPendingFollowRequest) {
              setHasPendingFollowRequest(true);
              onProfileReload(reloadedProfile);
            } else {
              setHasRequestError(true);
            }
          } else {
            onProfileReload(reloadedProfile);
          }
        } catch {
          setHasRequestError(true);
        }
      } else {
        setHasRequestError(true);
      }
    } finally {
      setIsRequesting(false);
    }
  }

  return <section className="account-page"><header className="account-page__header account-page__header--public"><button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button">← {messages.publicAccount.back}</button></header><div className="account-page__content"><section className="account-profile"><div className="account-profile__body"><div className="account-profile__actions"><button aria-label={isRequesting ? messages.publicAccount.followRequestSending : hasPendingFollowRequest ? messages.publicAccount.followRequestSent : messages.publicAccount.followRequest} className={hasPendingFollowRequest ? 'account-page__follow account-page__follow--followed' : 'account-page__follow'} disabled={isRequesting || hasPendingFollowRequest} onClick={() => void requestFollow()} type="button"><FollowIcon />{isRequesting ? messages.publicAccount.followRequestSending : hasPendingFollowRequest ? messages.publicAccount.followRequestSent : messages.publicAccount.followRequest}</button></div><div className="account-profile__details"><h1 className="account-profile__name">{profile.name}</h1></div></div>{hasRequestError && <p className="account-page__block-error" role="alert">{messages.publicAccount.followError}</p>}</section></div></section>;
}

function FollowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></svg>;
}
