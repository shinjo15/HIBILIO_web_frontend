import { RoutineCard } from '../../routineFeed/components/RoutineCard';
import type { Routine } from '../../routineFeed/domain/routine';
import '../../routineFeed/routineFeed.css';
import messages from '../../../shared/message/message.json';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

type PostsListProps = { posts: Routine[] };
type LikesListProps = { likes: Routine[]; status: Status };

export function AccountPostsList({ posts }: PostsListProps) {
  if (posts.length === 0) return <p className="account-page__state">{messages.account.postsEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{posts.map((post) => <RoutineCard key={post.id} routine={post} />)}</div>;
}

export function AccountLikesList({ likes, status }: LikesListProps) {
  if (status === 'loading' || status === 'idle') return <p className="account-page__state account-page__state--loading">{messages.account.likesLoading}</p>;
  if (status === 'error') return <p className="account-page__state account-page__state--error">{messages.account.likesError}</p>;
  if (likes.length === 0) return <p className="account-page__state">{messages.account.likesEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{likes.map((like) => <RoutineCard key={like.id} routine={like} />)}</div>;
}
