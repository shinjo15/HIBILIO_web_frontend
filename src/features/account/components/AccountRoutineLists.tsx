import { RoutineCard } from '../../routineFeed/components/RoutineCard';
import type { Routine } from '../../routineFeed/domain/routine';
import '../../routineFeed/routineFeed.css';
import messages from '../../../shared/message/message.json';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

type InfiniteListProps = { error: boolean; retry: () => void; sentinelRef: (element: Element | null) => void | (() => void) };
type PostsListProps = InfiniteListProps & { canReport?: (routine: Routine) => boolean; likeAnimation: { postIdentifier: string; type: 'like' | 'unlike' } | null; likeError: boolean; likingPostIdentifier: string | null; onLike: (postIdentifier: string) => void; onReport?: (routine: Routine) => void; posts: Routine[] };
type LikesListProps = InfiniteListProps & { canReport?: (routine: Routine) => boolean; likeAnimation: { postIdentifier: string; type: 'like' | 'unlike' } | null; likeError: boolean; likingPostIdentifier: string | null; likes: Routine[]; onLike: (postIdentifier: string) => void; onReport?: (routine: Routine) => void; status: Status };

export function AccountPostsList({ canReport, error, likeAnimation, likeError, likingPostIdentifier, onLike, onReport, posts, retry, sentinelRef }: PostsListProps) {
  if (error && posts.length === 0) return <AccountListError message={messages.account.error} retry={retry} />;
  if (posts.length === 0) return <p className="account-page__state">{messages.account.postsEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{error && <AccountListError message={messages.account.error} retry={retry} />}{likeError && <p className="account-page__state account-page__state--error">{messages.routineFeed.likeError}</p>}{posts.map((post) => <RoutineCard isLiking={likingPostIdentifier === post.id} key={post.id} likeAnimation={likeAnimation?.postIdentifier === post.id ? likeAnimation.type : null} onLike={onLike} onReport={canReport?.(post) ? onReport : undefined} routine={post} />)}<div aria-label="さらに読み込む" ref={sentinelRef} /></div>;
}

export function AccountLikesList({ canReport, error, likeAnimation, likeError, likingPostIdentifier, likes, onLike, onReport, retry, sentinelRef, status }: LikesListProps) {
  if (status === 'loading' || status === 'idle') return <p className="account-page__state account-page__state--loading">{messages.account.likesLoading}</p>;
  if (status === 'error') return <AccountListError message={messages.account.likesError} retry={retry} />;
  if (likes.length === 0) return <p className="account-page__state">{messages.account.likesEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{error && <AccountListError message={messages.account.likesError} retry={retry} />}{likeError && <p className="account-page__state account-page__state--error">{messages.routineFeed.likeError}</p>}{likes.map((like) => <RoutineCard isLiking={likingPostIdentifier === like.id} key={like.id} likeAnimation={likeAnimation?.postIdentifier === like.id ? likeAnimation.type : null} onLike={onLike} onReport={canReport?.(like) ? onReport : undefined} routine={like} />)}<div aria-label="さらに読み込む" ref={sentinelRef} /></div>;
}

function AccountListError({ message, retry }: { message: string; retry: () => void }) {
  return <p className="account-page__state account-page__state--error">{message} <button onClick={retry} type="button">再試行</button></p>;
}
