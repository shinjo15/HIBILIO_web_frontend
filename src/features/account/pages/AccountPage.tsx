import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
import { AccountAvatar, AccountHeaderImage } from '../../../shared/components/AccountImage';
import { routineLikeService, RoutineLikeUnauthorizedError, type RoutineLikeService } from '../../routineFeed/services/routineLikeService';
import { accountBlockService, AccountBlockError, AccountBlockUnauthorizedError, type AccountBlockService } from '../services/accountBlockService';
import { accountFollowService, AccountFollowError, AccountFollowUnauthorizedError, type AccountFollowService } from '../services/accountFollowService';
import messages from '../../../shared/message/message.json';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { ReportDialog } from '../../report/components/ReportDialog';
import type { ReportService } from '../../report/services/reportService';
import '../account.css';

type AccountPageProps = { blockService?: AccountBlockService; currentAccountIdentifier?: string | null; followService?: AccountFollowService; isOwnAccount?: boolean; likeService?: RoutineLikeService; notFoundMessage?: string; onBack?: () => void; reportService?: ReportService; service?: AccountService; showPublicActions?: boolean };

const tabs: Array<{ label: string; value: AccountTab }> = [
  { label: messages.account.tabs.posts, value: 'posts' },
  { label: messages.account.tabs.likes, value: 'likes' },
  { label: messages.account.tabs.executionHistory, value: 'executionHistory' },
  { label: messages.account.tabs.blockedAccounts, value: 'blockedAccounts' },
];

export function AccountPage({ blockService = accountBlockService, currentAccountIdentifier, followService = accountFollowService, isOwnAccount = true, likeService = routineLikeService, notFoundMessage, onBack, reportService, service = accountService, showPublicActions = true }: AccountPageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
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
  const [blockedAccountsStatus, setBlockedAccountsStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportingRoutine, setReportingRoutine] = useState<Routine | null>(null);

  const handleListError = useCallback((error: unknown) => {
    if (error instanceof AccountUnauthorizedError) {
      clearAuthenticated();
      navigate('/login');
    }
  }, [navigate]);
  const fetchPostsPage = useCallback(async (page: number) => {
    if (service.listPostsPage !== undefined) return service.listPostsPage(page);
    const items = await service.listPosts();
    return { items, total: items.length };
  }, [service]);
  const fetchLikesPage = useCallback(async (page: number) => {
    if (service.listLikesPage !== undefined) return service.listLikesPage(page);
    const items = await service.listLikes();
    return { items, total: items.length };
  }, [service]);
  const fetchExecutionHistoriesPage = useCallback(async (page: number) => {
    if (service.listExecutionHistoriesPage !== undefined) return service.listExecutionHistoriesPage(page);
    const items = await service.listExecutionHistories();
    return { items, total: items.length };
  }, [service]);
  const postsList = useInfiniteList({ enabled: activeTab === 'posts', fetchPage: fetchPostsPage, key: 'account-posts', onError: handleListError, preserveWhenDisabled: true });
  const likesList = useInfiniteList({ enabled: isOwnAccount || activeTab === 'likes', fetchPage: fetchLikesPage, key: 'account-likes', onError: handleListError, preserveWhenDisabled: true });
  const executionHistoriesList = useInfiniteList({ enabled: true, fetchPage: fetchExecutionHistoriesPage, key: 'account-execution-history', onError: handleListError, preserveWhenDisabled: true });
  const posts = postsList.items;
  const likes = likesList.items;
  const executionHistories = executionHistoriesList.items;

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

    return () => { cancelled = true; };
  }, [navigate, service]);

  useEffect(() => {
    if (!isOwnAccount) return;

    let cancelled = false;
    service.listBlockedAccounts()
      .then((loadedAccounts) => {
        if (!cancelled) {
          setBlockedAccounts(loadedAccounts);
          setBlockedAccountsStatus('loaded');
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AccountUnauthorizedError) {
          clearAuthenticated();
          navigate('/login');
          return;
        }

        setBlockedAccountsStatus('error');
      });

    return () => { cancelled = true; };
  }, [isOwnAccount, navigate, service]);

  function selectTab(tab: AccountTab) {
    setActiveTab(tab);
  }

  async function toggleLike(postIdentifier: string) {
    const routine = [...posts, ...likes].find((item) => item.id === postIdentifier);
    if (routine === undefined) return;
    const type = routine.liked ? 'unlike' : 'like';
    const updateLike = (item: Routine) => item.id === postIdentifier ? { ...item, liked: !routine.liked, likes: item.likes + (routine.liked ? -1 : 1) } : item;
    setLikingPostIdentifier(postIdentifier);
    setLikeAnimation({ postIdentifier, type });
    setLikeError(false);
    postsList.setItems((current) => current.map(updateLike));
    likesList.setItems((current) => current.map(updateLike));
    try {
      if (routine.liked) {
        await likeService.remove(postIdentifier);
      } else {
        await likeService.create(postIdentifier);
      }
    } catch (error) {
      const rollback = (item: Routine) => item.id === postIdentifier ? routine : item;
      postsList.setItems((current) => current.map(rollback));
      likesList.setItems((current) => current.map(rollback));
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
    executionHistory: executionHistoriesList.total ?? (executionHistoriesList.error ? executionHistories.length : null),

    likes: likesList.total ?? (likesList.error ? likes.length : null),
    posts: postsList.total ?? (postsList.error ? posts.length : null),
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
            <AccountHeaderImage headerImageUrl={profile.headerImageUrl ?? null} />
            <AccountAvatar className="account-profile__avatar" iconImageUrl={profile.iconImageUrl ?? null} initial={profile.initial} />
          </div>
          <div className="account-profile__body">
            <div className="account-profile__actions">
              {isOwnAccount && <button className="account-page__edit" onClick={() => navigate('/account/edit')} type="button">{messages.account.edit}</button>}
              {!isOwnAccount && showPublicActions && <><button aria-label={isFollowing ? messages.publicAccount.following : isFollowed ? messages.publicAccount.followed : messages.publicAccount.follow} className={isFollowed ? 'account-page__follow account-page__follow--followed' : 'account-page__follow'} disabled={isFollowing || isFollowed} onClick={() => void followAccount()} type="button"><FollowIcon />{isFollowing ? messages.publicAccount.following : isFollowed ? messages.publicAccount.followed : messages.publicAccount.follow}</button><IconButton aria-controls={actionMenuAnchor !== null ? 'account-action-menu' : undefined} aria-expanded={actionMenuAnchor !== null} aria-haspopup="menu" aria-label={messages.report.accountMenu} className="account-page__more" onClick={(event) => setActionMenuAnchor(event.currentTarget)} size="small"><MoreVertIcon /></IconButton></>}
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
        {!isOwnAccount && <><Menu anchorEl={actionMenuAnchor} id="account-action-menu" onClose={() => setActionMenuAnchor(null)} open={actionMenuAnchor !== null}><MenuItem disabled={isBlocking || isBlocked} onClick={() => { setActionMenuAnchor(null); void blockAccount(); }}><ListItemIcon className="account-action-menu__icon"><BlockOutlinedIcon fontSize="small" /></ListItemIcon>{isBlocking ? messages.publicAccount.blocking : isBlocked ? messages.publicAccount.blocked : messages.report.accountMenuBlock}</MenuItem><MenuItem onClick={() => { setActionMenuAnchor(null); setIsReportDialogOpen(true); }}><ListItemIcon className="account-action-menu__icon"><FlagOutlinedIcon fontSize="small" /></ListItemIcon>{messages.report.accountMenuReport}</MenuItem></Menu><ReportDialog onClose={() => setIsReportDialogOpen(false)} onUnauthorized={() => { clearAuthenticated(); navigate('/login'); }} open={isReportDialogOpen} service={reportService} targetAccountIdentifier={profile.accountIdentifier} /></>}

        {activeTab === 'posts' && <AccountPostsList canReport={(routine) => isOwnAccount ? profile.accountIdentifier !== routine.accountId : currentAccountIdentifier === null || (currentAccountIdentifier !== undefined && currentAccountIdentifier !== routine.accountId)} error={postsList.error} likeAnimation={likeAnimation} likeError={likeError} likingPostIdentifier={likingPostIdentifier} onLike={toggleLike} onReport={setReportingRoutine} posts={posts} retry={postsList.retry} sentinelRef={postsList.sentinelRef} />}
        {activeTab === 'likes' && <AccountLikesList canReport={(routine) => isOwnAccount ? profile.accountIdentifier !== routine.accountId : currentAccountIdentifier === null || (currentAccountIdentifier !== undefined && currentAccountIdentifier !== routine.accountId)} error={likesList.error} likeAnimation={likeAnimation} likeError={likeError} likingPostIdentifier={likingPostIdentifier} likes={likes} onLike={toggleLike} onReport={setReportingRoutine} retry={likesList.retry} sentinelRef={likesList.sentinelRef} status={likesList.total === null && !likesList.error ? 'loading' : likesList.error && likes.length === 0 ? 'error' : 'loaded'} />}
        {activeTab === 'executionHistory' && <ExecutionHistoryList error={executionHistoriesList.error} histories={executionHistories} onSelect={(history) => navigate(`/routines/${history.routineId}/executions/${history.id}`)} retry={executionHistoriesList.retry} sentinelRef={executionHistoriesList.sentinelRef} />}
        {activeTab === 'blockedAccounts' && <AccountRelationListState accounts={blockedAccounts} action={(account) => <button className="account-relation-card-with-action__button" disabled={unblockingAccountIdentifier === account.accountIdentifier} onClick={(event) => { event.stopPropagation(); void removeBlock(account); }} type="button"><BlockIcon />{unblockingAccountIdentifier === account.accountIdentifier ? messages.account.unblocking : messages.account.unblock}</button>} actionError={unblockError ? messages.account.unblockError : null} emptyMessage={messages.account.blockedAccountsEmpty} errorMessage={messages.account.blockedAccountsError} loadingMessage={messages.account.blockedAccountsLoading} status={blockedAccountsStatus} />}
        {reportingRoutine !== null && <ReportDialog onClose={() => setReportingRoutine(null)} onUnauthorized={() => { clearAuthenticated(); navigate('/login'); }} open service={reportService} targetAccountIdentifier={reportingRoutine.accountId} targetPostIdentifier={reportingRoutine.id} />}
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

function ExecutionHistoryList({ error, histories, onSelect, retry, sentinelRef }: { error: boolean; histories: AccountExecutionSummary[]; onSelect: (history: AccountExecutionSummary) => void; retry: () => void; sentinelRef: (element: Element | null) => void | (() => void) }) {
  if (error && histories.length === 0) return <p className="account-page__state account-page__state--error">{messages.account.error} <button onClick={retry} type="button">再試行</button></p>;
  if (histories.length === 0) {
    return <p className="account-page__state">{messages.account.executionHistoryEmpty}</p>;
  }

  return <div className="account-page__list" role="tabpanel">{histories.map((history) => {
    return (
      <button aria-label={history.routineTitle} className="account-page__card" key={history.id} onClick={() => onSelect(history)} type="button">
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
      </button>
    );
  })}{error && <p className="account-page__state account-page__state--error">{messages.account.error} <button onClick={retry} type="button">再試行</button></p>}<div aria-label="さらに読み込む" ref={sentinelRef} /></div>;
}

function AccountRelationListState({ accounts, action, actionError, emptyMessage, errorMessage, loadingMessage, status }: { accounts: AccountRelation[]; action: (account: AccountRelation) => ReactNode; actionError: string | null; emptyMessage: string; errorMessage: string; loadingMessage: string; status: 'idle' | 'loading' | 'loaded' | 'error' }) {
  if (status === 'idle' || status === 'loading') return <p className="account-page__state account-page__state--loading">{loadingMessage}</p>;
  if (status === 'error') return <p className="account-page__state account-page__state--error">{errorMessage}</p>;
  if (accounts.length === 0) return <p className="account-page__state">{emptyMessage}</p>;

  return <>{actionError !== null && <p className="account-page__state account-page__state--error" role="alert">{actionError}</p>}<AccountRelationList accounts={accounts} action={action} className="account-page__list" /></>;
}
