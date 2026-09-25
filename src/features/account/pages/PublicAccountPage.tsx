import CloseIcon from '@mui/icons-material/Close';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountService as defaultCurrentAccountService, AccountUnauthorizedError, type AccountService } from '../services/accountService';
import { publicAccountService, type PrivateAccountProfile, type PublicAccountProfile, type PublicAccountService } from '../services/publicAccountService';

import { AccountPage } from './AccountPage';
import { accountBlockService, type AccountBlockService } from '../services/accountBlockService';
import { accountFollowService, AccountFollowError, AccountFollowUnauthorizedError, type AccountFollowService } from '../services/accountFollowService';
import messages from '../../../shared/message/message.json';
import { clearAuthenticated } from '../../auth/services/authSession';
import { AccountAvatar, AccountHeaderImage } from '../../../shared/components/AccountImage';

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
  const [isRemoving, setIsRemoving] = useState(false);
  const [hasRequestError, setHasRequestError] = useState(false);
  const [removeRequestError, setRemoveRequestError] = useState<string | null>(null);

  async function requestFollow() {
    if (hasPendingFollowRequest || isRequesting || isRemoving) return;
    setIsRequesting(true);
    setHasRequestError(false);
    setRemoveRequestError(null);
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

  async function removeFollowRequest() {
    if (!hasPendingFollowRequest || isRequesting || isRemoving) return;
    setIsRemoving(true);
    setHasRequestError(false);
    setRemoveRequestError(null);
    try {
      await followService.remove(profile.accountIdentifier);
      setHasPendingFollowRequest(false);
      onProfileReload({ ...profile, hasPendingFollowRequest: false });
    } catch (error) {
      if (error instanceof AccountFollowUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else if (error instanceof AccountFollowError && error.status === 404) {
        setRemoveRequestError(messages.publicAccount.followRequestCancelNotFound);
      } else if (error instanceof AccountFollowError && error.status === 409) {
        setRemoveRequestError(messages.publicAccount.followRequestCancelConflict);
      } else {
        setRemoveRequestError(messages.publicAccount.followRequestCancelError);
      }
    } finally {
      setIsRemoving(false);
    }
  }

  return <section className="account-page"><header className="account-page__header account-page__header--public"><button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button">← {messages.publicAccount.back}</button></header><div className="account-page__content"><section className="account-profile"><div className="account-profile__banner"><AccountHeaderImage headerImageUrl={null} /><AccountAvatar className="account-profile__avatar" iconImageUrl={null} initial={profile.name.charAt(0)} /></div><div className="account-profile__body"><div className="account-profile__actions account-profile__actions--private">{hasPendingFollowRequest ? <button aria-label={isRemoving ? messages.publicAccount.followRequestCancelling : messages.publicAccount.followRequestSentCancelable} className="account-page__follow-request-sent" disabled={isRequesting || isRemoving} onClick={() => void removeFollowRequest()} title={isRemoving ? messages.publicAccount.followRequestCancelling : messages.publicAccount.followRequestSentCancelable} type="button">{isRemoving ? messages.publicAccount.followRequestCancelling : <><span>{messages.publicAccount.followRequestSent}</span><CloseIcon fontSize="small" /></>}</button> : <button aria-label={isRequesting ? messages.publicAccount.followRequestSending : messages.publicAccount.followRequest} className="account-page__follow" disabled={isRequesting || isRemoving} onClick={() => void requestFollow()} type="button"><FollowIcon />{isRequesting ? messages.publicAccount.followRequestSending : messages.publicAccount.followRequest}</button>}</div><div className="account-profile__details"><h1 className="account-profile__name">{profile.name}</h1></div></div>{(hasRequestError || removeRequestError !== null) && <p className="account-page__block-error" role="alert">{removeRequestError ?? messages.publicAccount.followError}</p>}</section><p className="account-page__state">{messages.publicAccount.privateAccountNotice}</p></div></section>;
}

function FollowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></svg>;
}
