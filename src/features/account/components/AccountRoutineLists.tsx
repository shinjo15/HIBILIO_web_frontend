import type { AccountPost, LikedRoutine } from '../domain/account';
import messages from '../../../shared/message/message.json';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

type PostsListProps = { posts: AccountPost[]; onSelectRoutine: (routineId: string) => void };
type LikesListProps = { likes: LikedRoutine[]; status: Status; onSelectRoutine: (routineId: string) => void };

export function AccountPostsList({ posts, onSelectRoutine }: PostsListProps) {
  if (posts.length === 0) return <p className="account-page__state">{messages.account.postsEmpty}</p>;

  return <div className="account-page__list" role="tabpanel">{posts.map((post) => (
    <button className="account-page__card" key={post.id} onClick={() => onSelectRoutine(post.routineId)} type="button">
      <div className="account-page__card-body"><div className="account-page__card-header"><h2 className="account-page__card-title">{post.title}</h2><span className="account-page__card-date">{new Date(post.createdAt).toLocaleDateString('ja-JP')}</span></div></div>
      <div className="account-page__card-metrics"><span className="account-page__metric account-page__metric--accent">♥ {post.likes}</span><span className="account-page__metric">▷ {post.executions}</span></div>
    </button>
  ))}</div>;
}

export function AccountLikesList({ likes, status, onSelectRoutine }: LikesListProps) {
  if (status === 'loading' || status === 'idle') return <p className="account-page__state account-page__state--loading">{messages.account.likesLoading}</p>;
  if (status === 'error') return <p className="account-page__state account-page__state--error">{messages.account.likesError}</p>;
  if (likes.length === 0) return <p className="account-page__state">{messages.account.likesEmpty}</p>;

  return <div className="account-page__list" role="tabpanel">{likes.map((like) => (
    <button className="account-page__card" key={like.postId} onClick={() => onSelectRoutine(like.routineId)} type="button">
      <div className="account-page__card-body"><div className="account-page__card-header"><h2 className="account-page__card-title">{like.title}</h2><span className="account-page__card-date">{new Date(like.likedAt).toLocaleDateString('ja-JP')}</span></div><p className="account-profile__handle">{like.authorName}</p></div>
      <div className="account-page__card-metrics"><span className="account-page__metric account-page__metric--accent">♥ {like.totalLikes}</span><span className="account-page__metric">{messages.account.support} {like.supports}</span></div>
    </button>
  ))}</div>;
}
