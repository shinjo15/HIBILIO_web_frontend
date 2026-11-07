import { RoutineCard } from '../../routineFeed/components/RoutineCard';
import type { Routine } from '../../routineFeed/domain/routine';
import type { AccountRoutine } from '../domain/account';
import { ExecutionHistoryCard } from '../../../shared/components/ExecutionHistoryCard';
import '../../routineFeed/routineFeed.css';
import '../../routineFeed/routineFeedTypography.css';
import messages from '../../../shared/message/message.json';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

type InfiniteListProps = { error: boolean; retry: () => void; sentinelRef: (element: Element | null) => void | (() => void) };
type PostsListProps = InfiniteListProps & { canReport?: (routine: AccountRoutine) => boolean; likeAnimations: ReadonlyMap<string, 'like' | 'unlike'>; likeError: boolean; likingPostIdentifiers: ReadonlySet<string>; isInitialLoading: boolean; onLike: (postIdentifier: string) => void; onReport?: (routine: AccountRoutine) => void; onSelectExecution: (routineId: string, executionId: string) => void; posts: AccountRoutine[] };
type LikesListProps = InfiniteListProps & { canReport?: (routine: Routine) => boolean; likeAnimations: ReadonlyMap<string, 'like' | 'unlike'>; likeError: boolean; likingPostIdentifiers: ReadonlySet<string>; likes: Routine[]; onLike: (postIdentifier: string) => void; onReport?: (routine: Routine) => void; status: Status };
type RoutinesListProps = InfiniteListProps & { likeAnimations: ReadonlyMap<string, 'like' | 'unlike'>; likingPostIdentifiers: ReadonlySet<string>; onLike: (postIdentifier: string) => void; routines: AccountRoutine[]; status: Status };

export function AccountPostsList({ canReport, error, isInitialLoading, likeAnimations, likeError, likingPostIdentifiers, onLike, onReport, onSelectExecution, posts, retry, sentinelRef }: PostsListProps) {
  if (isInitialLoading) return <p className="account-page__state account-page__state--loading">{messages.account.postsLoading}</p>;
  if (error && posts.length === 0) return <AccountListError message={messages.account.error} retry={retry} />;
  if (posts.length === 0) return <p className="account-page__state">{messages.account.postsEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{error && <AccountListError message={messages.account.error} retry={retry} />}{likeError && <p className="account-page__state account-page__state--error">{messages.routineFeed.likeError}</p>}{posts.map((post) => isExecutionPost(post)
    ? <div className="routine-feed-execution-post" key={post.id}><ExecutionHistoryCard author={{ iconImageUrl: post.iconImageUrl ?? null, name: post.authorName }} execution={{ executedActionCount: post.executedActionCount, id: post.routineExecutionId, memo: post.executionMemo, postedAt: post.createdAt, routineId: post.routineId, routineTitle: post.title, supportCount: post.supportCount }} onSelect={(execution) => onSelectExecution(execution.routineId, execution.id)} /></div>
    : <RoutineCard isLiking={post.id !== null && likingPostIdentifiers.has(post.id)} key={post.id} likeAnimation={post.id === null ? null : likeAnimations.get(post.id) ?? null} onLike={onLike} onReport={canReport?.(post) ? onReport : undefined} routine={post} />)}<div aria-label="さらに読み込む" ref={sentinelRef} /></div>;
}

export function AccountRoutinesList({ error, likeAnimations, likingPostIdentifiers, onLike, retry, routines, sentinelRef, status }: RoutinesListProps) {
  if (status === 'loading' || status === 'idle') return <p className="account-page__state account-page__state--loading">{messages.account.routinesLoading}</p>;
  if (error && routines.length === 0) return <AccountListError message={messages.account.routinesError} retry={retry} />;
  if (routines.length === 0) return <p className="account-page__state">{messages.account.routinesEmpty}</p>;
  return <div className="account-page__list routine-feed-page" role="tabpanel">{error && <AccountListError message={messages.account.routinesError} retry={retry} />}{routines.map((routine) => <RoutineCard isLiking={routine.id !== null && likingPostIdentifiers.has(routine.id)} key={routine.routineId} likeAnimation={routine.id === null ? null : likeAnimations.get(routine.id) ?? null} onLike={onLike} routine={routine} />)}<div aria-label="さらに読み込む" ref={sentinelRef} /></div>;
}

export function AccountLikesList({ canReport, error, likeAnimations, likeError, likingPostIdentifiers, likes, onLike, onReport, retry, sentinelRef, status }: LikesListProps) {
  if (status === 'loading' || status === 'idle') return <p className="account-page__state account-page__state--loading">{messages.account.likesLoading}</p>;
  if (status === 'error') return <AccountListError message={messages.account.likesError} retry={retry} />;
  if (likes.length === 0) return <p className="account-page__state">{messages.account.likesEmpty}</p>;

  return <div className="account-page__list routine-feed-page" role="tabpanel">{error && <AccountListError message={messages.account.likesError} retry={retry} />}{likeError && <p className="account-page__state account-page__state--error">{messages.routineFeed.likeError}</p>}{likes.map((like) => <RoutineCard isLiking={likingPostIdentifiers.has(like.id)} key={like.id} likeAnimation={likeAnimations.get(like.id) ?? null} onLike={onLike} onReport={canReport?.(like) ? onReport : undefined} routine={like} />)}<div aria-label="さらに読み込む" ref={sentinelRef} /></div>;
}

function AccountListError({ message, retry }: { message: string; retry: () => void }) {
  return <p className="account-page__state account-page__state--error">{message} <button onClick={retry} type="button">再試行</button></p>;
}

function isExecutionPost(routine: AccountRoutine): routine is AccountRoutine & { executedActionCount: number; executionMemo: string | null; routineExecutionId: string; supportCount: number } {
  return routine.postCategory === 'action' && routine.routineExecutionId !== null && routine.routineExecutionId !== undefined && routine.executedActionCount !== undefined && routine.executionMemo !== undefined && routine.supportCount !== undefined;
}
