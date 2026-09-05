import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AccountExecutionHistory,
  AccountPost,
  AccountProfile,
  AccountTab,
  LikedRoutine,
} from '../domain/account';
import { accountService, type AccountService } from '../services/accountService';
import messages from '../../../shared/message/message.json';
import '../account.css';

type AccountPageProps = { service?: AccountService };

const tabs: Array<{ label: string; value: AccountTab }> = [
  { label: messages.account.tabs.posts, value: 'posts' },
  { label: messages.account.tabs.likes, value: 'likes' },
  { label: messages.account.tabs.executionHistory, value: 'executionHistory' },
];

export function AccountPage({ service = accountService }: AccountPageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [posts, setPosts] = useState<AccountPost[]>([]);
  const [executionHistories, setExecutionHistories] = useState<AccountExecutionHistory[]>([]);
  const [likes, setLikes] = useState<LikedRoutine[]>([]);
  const [activeTab, setActiveTab] = useState<AccountTab>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [likesStatus, setLikesStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;

    Promise.all([service.getProfile(), service.listPosts(), service.listExecutionHistories()])
      .then(([loadedProfile, loadedPosts, loadedExecutionHistories]) => {
        if (!cancelled) {
          setProfile(loadedProfile);
          setPosts(loadedPosts);
          setExecutionHistories(loadedExecutionHistories);
          setHasError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [service]);

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
      .catch(() => setLikesStatus('error'));
  }

  if (isLoading) {
    return <p className="account-page__state account-page__state--loading">{messages.account.loading}</p>;
  }

  if (hasError || !profile) {
    return <p className="account-page__state account-page__state--error">{messages.account.error}</p>;
  }

  const tabCounts: Record<AccountTab, number | null> = {
    executionHistory: executionHistories.length,
    likes: likesStatus === 'loaded' ? likes.length : null,
    posts: posts.length,
  };

  return (
    <section className="account-page">
      <header className="account-page__header">
        <h1 className="account-page__header-title">{messages.account.title}</h1>
        <button aria-label={messages.account.settings} className="account-page__settings" type="button">
          <SettingsOutlinedIcon fontSize="small" />
        </button>
      </header>

      <div className="account-page__content">
        <section className="account-profile">
          <div className="account-profile__banner">
            <span aria-hidden="true" className="account-profile__avatar">{profile.initial}</span>
          </div>
          <div className="account-profile__body">
            <div className="account-profile__actions">
              <button className="account-page__edit" type="button">{messages.account.edit}</button>
            </div>
            <div className="account-profile__details">
              <p className="account-profile__name">{profile.name}</p>
              <p className="account-profile__handle">@{profile.handle}</p>
              <p className="account-profile__bio">{profile.bio}</p>
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

        {activeTab === 'posts' && <PostsList posts={posts} onSelectRoutine={(routineId) => navigate(`/routines/${routineId}`)} />}
        {activeTab === 'likes' && <LikesList likes={likes} status={likesStatus} onSelectRoutine={(routineId) => navigate(`/routines/${routineId}`)} />}
        {activeTab === 'executionHistory' && <ExecutionHistoryList histories={executionHistories} onSelectHistory={(history) => navigate(`/routines/${history.routineId}/executions/${history.id}`)} />}
      </div>
    </section>
  );
}

function PostsList({ posts, onSelectRoutine }: { posts: AccountPost[]; onSelectRoutine: (routineId: string) => void }) {
  if (posts.length === 0) {
    return <p className="account-page__state">{messages.account.postsEmpty}</p>;
  }

  return <div className="account-page__list" role="tabpanel">{posts.map((post) => (
    <button className="account-page__card" key={post.id} onClick={() => onSelectRoutine(post.routineId)} type="button">
      <div className="account-page__card-body">
        <div className="account-page__card-header">
          <h2 className="account-page__card-title">{post.title}</h2>
          <span className="account-page__card-date">{post.createdAtLabel}</span>
        </div>
      </div>
      <div className="account-page__card-metrics">
        <span className="account-page__metric account-page__metric--accent">♥ {post.likes}</span>
        <span className="account-page__metric">▷ {post.executions}</span>
      </div>
    </button>
  ))}</div>;
}

function LikesList({ likes, status, onSelectRoutine }: { likes: LikedRoutine[]; status: 'idle' | 'loading' | 'loaded' | 'error'; onSelectRoutine: (routineId: string) => void }) {
  if (status === 'loading' || status === 'idle') {
    return <p className="account-page__state account-page__state--loading">{messages.account.likesLoading}</p>;
  }

  if (status === 'error') {
    return <p className="account-page__state account-page__state--error">{messages.account.likesError}</p>;
  }

  if (likes.length === 0) {
    return <p className="account-page__state">{messages.account.likesEmpty}</p>;
  }

  return <div className="account-page__list" role="tabpanel">{likes.map((like) => (
    <button className="account-page__card" key={like.postId} onClick={() => onSelectRoutine(like.routineId)} type="button">
      <div className="account-page__card-body">
        <div className="account-page__card-header">
          <h2 className="account-page__card-title">{messages.account.likedRoutine}</h2>
          <span className="account-page__card-date">{new Date(like.likedAt).toLocaleDateString('ja-JP')}</span>
        </div>
        <p className="account-profile__handle">{like.routineId}</p>
      </div>
      <div className="account-page__card-metrics">
        <span className="account-page__metric account-page__metric--accent">♥ {like.totalLikes}</span>
        <span className="account-page__metric">{messages.account.support} {like.supports}</span>
      </div>
    </button>
  ))}</div>;
}

function ExecutionHistoryList({ histories, onSelectHistory }: { histories: AccountExecutionHistory[]; onSelectHistory: (history: AccountExecutionHistory) => void }) {
  if (histories.length === 0) {
    return <p className="account-page__state">{messages.account.executionHistoryEmpty}</p>;
  }

  return <div className="account-page__list" role="tabpanel">{histories.map((history) => {
    const achievementRate = Math.round((history.achievedActions / history.totalActions) * 100);
    return (
      <button className="account-page__card" key={history.id} onClick={() => onSelectHistory(history)} type="button">
        <div className="account-page__card-body">
          <div className="account-page__card-header">
            <h2 className="account-page__card-title">{history.routineTitle}</h2>
            <span className="account-page__card-date">{history.executedAtLabel}</span>
          </div>
          <progress aria-label={messages.account.achievementRate} className="account-page__progress" max="100" value={achievementRate} />
        </div>
        <div className="account-page__card-metrics">
          <span>{messages.account.achieved} <strong>{history.achievedActions}/{history.totalActions}</strong></span>
          <span>{messages.account.duration} <strong>{history.minutes}{messages.account.minuteUnit}</strong></span>
          <span className={history.completed ? 'account-page__completion account-page__completion--complete' : 'account-page__completion'}>{history.completed ? messages.account.complete : `${achievementRate}%`}</span>
        </div>
      </button>
    );
  })}</div>;
}