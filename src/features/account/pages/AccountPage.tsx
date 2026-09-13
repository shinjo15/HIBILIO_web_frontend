import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AccountExecutionSummary,
  AccountProfile,
  AccountRelation,
  AccountTab,
} from '../domain/account';
import type { Routine } from '../../routineFeed/domain/routine';
import { AccountUnauthorizedError, accountService, type AccountService } from '../services/accountService';
import { registrationSocialPlatforms } from '../../auth/register/services/registrationSocialPlatforms';
import { clearAuthenticated } from '../../auth/services/authSession';
import { AccountLikesList, AccountPostsList } from '../components/AccountRoutineLists';
import { AccountRelationList } from '../../../shared/components/AccountRelationList';
import { routineLikeService, RoutineLikeUnauthorizedError, type RoutineLikeService } from '../../routineFeed/services/routineLikeService';
import { accountBlockService, AccountBlockError, AccountBlockUnauthorizedError, type AccountBlockService } from '../services/accountBlockService';
import { accountFollowService, AccountFollowError, AccountFollowUnauthorizedError, type AccountFollowService } from '../services/accountFollowService';
import messages from '../../../shared/message/message.json';
import '../account.css';

type AccountPageProps = { blockService?: AccountBlockService; followService?: AccountFollowService; isOwnAccount?: boolean; likeService?: RoutineLikeService; notFoundMessage?: string; onBack?: () => void; service?: AccountService };

const tabs: Array<{ label: string; value: AccountTab }> = [
  { label: messages.account.tabs.posts, value: 'posts' },
  { label: messages.account.tabs.likes, value: 'likes' },
  { label: messages.account.tabs.executionHistory, value: 'executionHistory' },
  { label: messages.account.tabs.blockedAccounts, value: 'blockedAccounts' },
];

export function AccountPage({ blockService = accountBlockService, followService = accountFollowService, isOwnAccount = true, likeService = routineLikeService, notFoundMessage, onBack, service = accountService }: AccountPageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [posts, setPosts] = useState<Routine[]>([]);
  const [executionHistories, setExecutionHistories] = useState<AccountExecutionSummary[]>([]);
  const [likes, setLikes] = useState<Routine[]>([]);
  const [blockedAccounts, setBlockedAccounts] = useState<AccountRelation[]>([]);
  const [activeTab, setActiveTab] = useState<AccountTab>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [likeError, setLikeError] = useState(false);
  const [blockError, setBlockError] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [followError, setFollowError] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [unblockingAccountIdentifier, setUnblockingAccountIdentifier] = useState<string | null>(null);
  const [unblockError, setUnblockError] = useState(false);
  const [likingPostIdentifier, setLikingPostIdentifier] = useState<string | null>(null);
  const [likeAnimation, setLikeAnimation] = useState<{ postIdentifier: string; type: 'like' | 'unlike' } | null>(null);
  const [likesStatus, setLikesStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [blockedAccountsStatus, setBlockedAccountsStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;

    service.getProfile()
      .then((loadedProfile) => {
        if (!cancelled) {
          setProfile(loadedProfile);
          setHasError(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof AccountUnauthorizedError) {
            clearAuthenticated();
            navigate('/login');
            return;
          }

          setHasError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    service.listPosts().then((loadedPosts) => {
      if (!cancelled) setPosts(loadedPosts);
    }).catch(() => {});
    service.listExecutionHistories().then((loadedExecutionHistories) => {
      if (!cancelled) setExecutionHistories(loadedExecutionHistories);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [navigate, service]);

  function selectTab(tab: AccountTab) {
    setActiveTab(tab);


    if (tab === 'blockedAccounts' && blockedAccountsStatus === 'idle') {
      setBlockedAccountsStatus('loading');
      service.listBlockedAccounts()
        .then((loadedAccounts) => {
          setBlockedAccounts(loadedAccounts);
          setBlockedAccountsStatus('loaded');
        })
        .catch((error: unknown) => {
          if (error instanceof AccountUnauthorizedError) {
            clearAuthenticated();
            navigate('/login');
            return;
          }

          setBlockedAccountsStatus('error');
        });
      return;
    }

    if (tab !== 'likes' || likesStatus !== 'idle') {
      return;
    }

    setLikesStatus('loading');
    service.listLikes()
      .then((loadedLikes) => {
        setLikes(loadedLikes);
        setLikesStatus('loaded');
      })
      .catch((error: unknown) => {
        if (error instanceof AccountUnauthorizedError) {
          clearAuthenticated();
          navigate('/login');
          return;
        }

        setLikesStatus('error');
      });
  }

  async function toggleLike(postIdentifier: string) {
    const routine = [...posts, ...likes].find((item) => item.id === postIdentifier);
    if (routine === undefined) return;
    const type = routine.liked ? 'unlike' : 'like';
    const updateLike = (item: Routine) => item.id === postIdentifier ? { ...item, liked: !routine.liked, likes: item.likes + (routine.liked ? -1 : 1) } : item;
    setLikingPostIdentifier(postIdentifier);
    setLikeAnimation({ postIdentifier, type });
    setLikeError(false);
    setPosts((current) => current.map(updateLike));
    setLikes((current) => current.map(updateLike));
    try {
      if (routine.liked) {
        await likeService.remove(postIdentifier);
      } else {
        await likeService.create(postIdentifier);
      }
    } catch (error) {
      const rollback = (item: Routine) => item.id === postIdentifier ? routine : item;
      setPosts((current) => current.map(rollback));
      setLikes((current) => current.map(rollback));
      if (error instanceof RoutineLikeUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else {
        setLikeError(true);
      }
    } finally {
      setLikingPostIdentifier(null);
      setLikeAnimation(null);
    }
  }

  async function blockAccount() {
    if (!profile) return;

    setIsBlocking(true);
    setBlockError(false);
    try {
      await blockService.create(profile.accountIdentifier);
      setIsBlocked(true);
    } catch (error) {
      if (error instanceof AccountBlockUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else if (error instanceof AccountBlockError && error.status === 409) {
        setIsBlocked(true);
      } else {
        setBlockError(true);
      }
    } finally {
      setIsBlocking(false);
    }
  }

  async function followAccount() {
    if (!profile || isFollowing || isFollowed) return;

    setIsFollowing(true);
    setFollowError(false);
    try {
      await followService.create(profile.accountIdentifier);
      setIsFollowed(true);
    } catch (error) {
      if (error instanceof AccountFollowUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else if (error instanceof AccountFollowError && error.status === 409) {
        setIsFollowed(true);
      } else {
        setFollowError(true);
      }
    } finally {
      setIsFollowing(false);
    }
  }

  async function removeBlock(account: AccountRelation) {
    const index = blockedAccounts.findIndex((item) => item.accountIdentifier === account.accountIdentifier);
    setUnblockingAccountIdentifier(account.accountIdentifier);
    setUnblockError(false);
    setBlockedAccounts((current) => current.filter((item) => item.accountIdentifier !== account.accountIdentifier));
    try {
      await blockService.remove(account.accountIdentifier);
    } catch (error) {
      if (error instanceof AccountBlockUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else {
        setBlockedAccounts((current) => {
          if (current.some((item) => item.accountIdentifier === account.accountIdentifier)) return current;
          return [...current.slice(0, index), account, ...current.slice(index)];
        });
        setUnblockError(true);
      }
    } finally {
      setUnblockingAccountIdentifier(null);
    }
  }

  if (isLoading) {
    return <p className="account-page__state account-page__state--loading">{messages.account.loading}</p>;
  }

  if (hasError) {
    return <section className="account-page"><header className={isOwnAccount ? 'account-page__header' : 'account-page__header account-page__header--public'}>{!isOwnAccount && <button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button">← {messages.publicAccount.back}</button>}</header><p className="account-page__state account-page__state--error">{messages.account.error}</p></section>;
  }

  if (!profile) return <section className="account-page"><header className={isOwnAccount ? 'account-page__header' : 'account-page__header account-page__header--public'}>{!isOwnAccount && <button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button">← {messages.publicAccount.back}</button>}</header><p className="account-page__state">{notFoundMessage ?? messages.account.error}</p></section>;

  const tabCounts: Record<AccountTab, number | null> = {
    blockedAccounts: blockedAccountsStatus === 'loaded' ? blockedAccounts.length : null,
    executionHistory: executionHistories.length,

    likes: likesStatus === 'loaded' ? likes.length : null,
    posts: posts.length,
  };
  const displayedTabs = isOwnAccount ? tabs : tabs.slice(0, 3);

  return (
    <section className="account-page">
      <header className={isOwnAccount ? 'account-page__header account-page__header--own' : 'account-page__header account-page__header--public'}>
        {!isOwnAccount && <button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button">← {messages.publicAccount.back}</button>}
        {isOwnAccount && <><h1 className="account-page__header-title">{messages.account.title}</h1><button aria-label={messages.account.settings} className="account-page__settings" onClick={() => navigate('/account/settings')} type="button"><SettingsOutlinedIcon fontSize="small" /></button></>}
      </header>

      <div className="account-page__content">
        <section className="account-profile">
          <div className="account-profile__banner">
            <span aria-hidden="true" className="account-profile__avatar">{profile.initial}</span>
          </div>
          <div className="account-profile__body">
            <div className="account-profile__actions">
              {isOwnAccount && <button className="account-page__edit" onClick={() => navigate('/account/edit')} type="button">{messages.account.edit}</button>}
              {!isOwnAccount && <><button aria-label={isFollowing ? messages.publicAccount.following : isFollowed ? messages.publicAccount.followed : messages.publicAccount.follow} className="account-page__follow" disabled={isFollowing || isFollowed} onClick={() => void followAccount()} type="button"><FollowIcon />{isFollowing ? messages.publicAccount.following : isFollowed ? messages.publicAccount.followed : messages.publicAccount.follow}</button><button aria-label={isBlocking ? messages.publicAccount.blocking : isBlocked ? messages.publicAccount.blocked : messages.publicAccount.block} className={isBlocked ? 'account-page__block account-page__block--blocked' : 'account-page__block'} disabled={isBlocking || isBlocked} onClick={() => void blockAccount()} type="button"><BlockIcon />{isBlocking ? messages.publicAccount.blocking : isBlocked ? messages.publicAccount.blocked : messages.publicAccount.block}</button></>}
            </div>
            <div className="account-profile__details">
              <h1 className="account-profile__name">{profile.name}</h1>
              {profile.bio !== null && <p className="account-profile__bio">{profile.bio}</p>}
              {profile.socialLinks.length > 0 && <div className="account-profile__social-links">
                {profile.socialLinks.map((link) => {
                  const platform = registrationSocialPlatforms.find((item) => item.socialType === link.socialType);
                  return platform === undefined ? null : <a className="account-profile__social-link" href={link.socialUrl} key={link.socialType} rel="noreferrer" target="_blank"><platform.Icon className={`account-profile__social-icon account-profile__social-icon--${link.socialType}`} /><span>{link.socialUrl.replace(platform.urlPrefix, '')}</span></a>;
                })}
              </div>}
              {profile.favoriteTags.length > 0 && <div className="account-profile__favorite-tags">
                {profile.favoriteTags.map((tag) => <span className="account-profile__favorite-tag" key={tag.id}>{tag.name}</span>)}
              </div>}
            </div>
          </div>
          {blockError && <p className="account-page__block-error" role="alert">{messages.publicAccount.blockError}</p>}
          {followError && <p className="account-page__block-error" role="alert">{messages.publicAccount.followError}</p>}
          <div aria-label={messages.account.tabs.ariaLabel} className={isOwnAccount ? 'account-tabs' : 'account-tabs account-tabs--three'} role="tablist">
            {displayedTabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.value}
                className={activeTab === tab.value ? 'account-tabs__tab account-tabs__tab--selected' : 'account-tabs__tab'}
                key={tab.value}
                onClick={() => selectTab(tab.value)}
                role="tab"
                type="button"
              >
                <span className="account-tabs__count">{tabCounts[tab.value] ?? messages.account.countLoading}</span>
                <span className="account-tabs__label">{tab.label}</span>
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'posts' && <AccountPostsList likeAnimation={likeAnimation} likeError={likeError} likingPostIdentifier={likingPostIdentifier} onLike={toggleLike} posts={posts} />}
        {activeTab === 'likes' && <AccountLikesList likeAnimation={likeAnimation} likeError={likeError} likingPostIdentifier={likingPostIdentifier} likes={likes} onLike={toggleLike} status={likesStatus} />}
        {activeTab === 'executionHistory' && <ExecutionHistoryList histories={executionHistories} />}
        {activeTab === 'blockedAccounts' && <AccountRelationListState accounts={blockedAccounts} action={(account) => <button className="account-relation-card-with-action__button" disabled={unblockingAccountIdentifier === account.accountIdentifier} onClick={(event) => { event.stopPropagation(); void removeBlock(account); }} type="button"><BlockIcon />{unblockingAccountIdentifier === account.accountIdentifier ? messages.account.unblocking : messages.account.unblock}</button>} actionError={unblockError ? messages.account.unblockError : null} emptyMessage={messages.account.blockedAccountsEmpty} errorMessage={messages.account.blockedAccountsError} loadingMessage={messages.account.blockedAccountsLoading} status={blockedAccountsStatus} />}
      </div>
    </section>
  );
}

function FollowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></svg>;
}

function BlockIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 14.14 14.14" /></svg>;
}

function ExecutionHistoryList({ histories }: { histories: AccountExecutionSummary[] }) {
  if (histories.length === 0) {
    return <p className="account-page__state">{messages.account.executionHistoryEmpty}</p>;
  }

  return <div className="account-page__list" role="tabpanel">{histories.map((history) => {
    return (
      <article className="account-page__card" key={history.id}>
        <div className="account-page__card-body">
          <div className="account-page__card-header">
            <h2 className="account-page__card-title">{history.routineTitle}</h2>
            <span className="account-page__card-date">{new Date(history.postedAt).toLocaleDateString('ja-JP')}</span>
          </div>
          {history.memo !== null && <p className="account-profile__handle">{history.memo}</p>}
        </div>
        <div className="account-page__card-metrics">
          <span>{messages.account.achieved} <strong>{history.executedActionCount}</strong></span>
          <span>{messages.account.support} <strong>{history.supportCount}</strong></span>
        </div>
      </article>
    );
  })}</div>;
}

function AccountRelationListState({ accounts, action, actionError, emptyMessage, errorMessage, loadingMessage, status }: { accounts: AccountRelation[]; action: (account: AccountRelation) => ReactNode; actionError: string | null; emptyMessage: string; errorMessage: string; loadingMessage: string; status: 'idle' | 'loading' | 'loaded' | 'error' }) {
  if (status === 'idle' || status === 'loading') return <p className="account-page__state account-page__state--loading">{loadingMessage}</p>;
  if (status === 'error') return <p className="account-page__state account-page__state--error">{errorMessage}</p>;
  if (accounts.length === 0) return <p className="account-page__state">{emptyMessage}</p>;

  return <>{actionError !== null && <p className="account-page__state account-page__state--error" role="alert">{actionError}</p>}<AccountRelationList accounts={accounts} action={action} className="account-page__list" /></>;
}