import { Link } from 'react-router-dom';
import { AccountAvatar } from './AccountImage';
import messages from '../message/message.json';
import '../../features/routineDetail/routineDetail.css';

type ExecutionPost = {
  achievedActionCount: number;
  authorInitial: string;
  authorName: string;
  dateLabel: string;
  executionId: string;
  iconImageUrl: string | null;
  memo?: string | null;
  routineId: string;
  supportCount: number;
  supported: boolean;
  totalActionCount: number;
};

type ExecutionPostCardProps = {
  post: ExecutionPost;
};

export function ExecutionPostCard({ post }: ExecutionPostCardProps) {
  const avatarClasses: Record<string, string> = {
    H: 'routine-detail-avatar--h',
    N: 'routine-detail-avatar--n',
    S: 'routine-detail-avatar--s',
    T: 'routine-detail-avatar--t',
    Y: 'routine-detail-avatar--y',
  };

  return (
    <article className="routine-detail-post">
      <Link className="routine-detail-post__content" to={`/routines/${post.routineId}/executions/${post.executionId}`}>
        <div className="routine-detail-post__author">
          <AccountAvatar className={`routine-detail-avatar ${avatarClasses[post.authorInitial] ?? 'routine-detail-avatar--default'}`} iconImageUrl={post.iconImageUrl} initial={post.authorInitial} />
          <div>
            <p>{post.authorName}</p>
            <span>{post.dateLabel}</span>
          </div>
        </div>
        <div className="routine-detail-post__metrics">
          <span>{messages.routineDetail.achieved} <strong>{post.achievedActionCount} / {post.totalActionCount} {messages.routineDetail.itemUnit}</strong></span>
        </div>
        {post.memo && <p className="routine-detail-post__comment">「{post.memo}」</p>}
      </Link>
      <button
        aria-label={`${post.supported ? messages.routineDetail.supported : messages.routineDetail.support} ${post.authorName}`}
        className={post.supported ? 'routine-detail-support routine-detail-support--supported' : 'routine-detail-support'}
        disabled
        type="button"
      >
        <SupportIcon filled={post.supported} />
        <span>{post.supported ? messages.routineDetail.supported : messages.routineDetail.support}</span>
        <strong>{post.supportCount}</strong>
      </button>
    </article>
  );
}

function SupportIcon({ filled }: { filled: boolean }) {
  return <svg aria-hidden="true" className="routine-detail-small-icon" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2H14Z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>;
}
