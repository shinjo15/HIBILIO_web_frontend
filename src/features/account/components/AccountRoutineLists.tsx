import { RoutineCard } from '../../routineFeed/components/RoutineCard';
import type { Routine } from '../../routineFeed/domain/routine';
import '../../routineFeed/routineFeed.css';
import messages from '../../../shared/message/message.json';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

type PostsListProps = { likeAnimation: { postIdentifier: string; type: 'like' | 'unlike' } | null; likeError: boolean; likingPostIdentifier: string | null; onLike: (postIdentifier: string) => void; posts: Routine[] };
type LikesListProps = { likeAnimation: { postIdentifier: string; type: 'like' | 'unlike' } | null; likeError: boolean; likingPostIdentifier: string | null; likes: Routine[]; onLike: (postIdentifier: string) => void; status: Status };

export function AccountPostsList({ likeAnimation, likeError, likingPostIdentifier, onLike, posts }: PostsListProps) {
  if (posts.length === 0) return <p className="account-page__state">{messages.account.postsEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{likeError && <p className="account-page__state account-page__state--error">{messages.routineFeed.likeError}</p>}{posts.map((post) => <RoutineCard isLiking={likingPostIdentifier === post.id} key={post.id} likeAnimation={likeAnimation?.postIdentifier === post.id ? likeAnimation.type : null} onLike={onLike} routine={post} />)}</div>;
}

export function AccountLikesList({ likeAnimation, likeError, likingPostIdentifier, likes, onLike, status }: LikesListProps) {
  if (status === 'loading' || status === 'idle') return <p className="account-page__state account-page__state--loading">{messages.account.likesLoading}</p>;
  if (status === 'error') return <p className="account-page__state account-page__state--error">{messages.account.likesError}</p>;
  if (likes.length === 0) return <p className="account-page__state">{messages.account.likesEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{likeError && <p className="account-page__state account-page__state--error">{messages.routineFeed.likeError}</p>}{likes.map((like) => <RoutineCard isLiking={likingPostIdentifier === like.id} key={like.id} likeAnimation={likeAnimation?.postIdentifier === like.id ? likeAnimation.type : null} onLike={onLike} routine={like} />)}</div>;
}
