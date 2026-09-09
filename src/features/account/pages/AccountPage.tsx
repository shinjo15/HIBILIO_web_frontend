import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AccountExecutionSummary,
  AccountProfile,
  AccountTab,
} from '../domain/account';
import type { Routine } from '../../routineFeed/domain/routine';
import { AccountUnauthorizedError, accountService, type AccountService } from '../services/accountService';
import { registrationSocialPlatforms } from '../../auth/register/services/registrationSocialPlatforms';
import { clearAuthenticated } from '../../auth/services/authSession';
import { AccountLikesList, AccountPostsList } from '../components/AccountRoutineLists';
import messages from '../../../shared/message/message.json';
import '../account.css';

type AccountPageProps = { isOwnAccount?: boolean; notFoundMessage?: string; onBack?: () => void; service?: AccountService };

const tabs: Array<{ label: string; value: AccountTab }> = [
  { label: messages.account.tabs.posts, value: 'posts' },
  { label: messages.account.tabs.likes, value: 'likes' },
  { label: messages.account.tabs.executionHistory, value: 'executionHistory' },
];

export function AccountPage({ isOwnAccount = true, notFoundMessage, onBack, service = accountService }: AccountPageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [posts, setPosts] = useState<Routine[]>([]);
  const [executionHistories, setExecutionHistories] = useState<AccountExecutionSummary[]>([]);
  const [likes, setLikes] = useState<Routine[]>([]);
  const [activeTab, setActiveTab] = useState<AccountTab>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [likesStatus, setLikesStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

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

  if (isLoading) {
    return <p className="account-page__state account-page__state--loading">{messages.account.loading}</p>;
  }

  if (hasError) {
    return <section className="account-page"><header className="account-page__header">{!isOwnAccount && <button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button">← {messages.publicAccount.back}</button>}</header><p className="account-page__state account-page__state--error">{messages.account.error}</p></section>;
  }

  if (!profile) return <section className="account-page"><header className="account-page__header">{!isOwnAccount && <button aria-label={messages.publicAccount.back} className="account-page__back" onClick={onBack} type="button">← {messages.publicAccount.back}</button>}</header><p className="account-page__state">{notFoundMessage ?? messages.account.error}</p></section>;

  const tabCounts: Record<AccountTab, number | null> = {
    executionHistory: executionHistories.length,
    likes: likesStatus === 'loaded' ? likes.length : null,
    posts: posts.length,
  };

  return (
    <section className="account-page">
      <header className="account-page__header">
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
              {!isOwnAccount && <><button className="account-page__follow" type="button"><FollowIcon />{messages.publicAccount.follow}</button><button className="account-page__block" type="button"><BlockIcon />{messages.publicAccount.block}</button></>}
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
          <div aria-label={messages.account.tabs.ariaLabel} className="account-tabs" role="tablist">
            {tabs.map((tab) => (
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

        {activeTab === 'posts' && <AccountPostsList posts={posts} />}
        {activeTab === 'likes' && <AccountLikesList likes={likes} status={likesStatus} />}
        {activeTab === 'executionHistory' && <ExecutionHistoryList histories={executionHistories} />}
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