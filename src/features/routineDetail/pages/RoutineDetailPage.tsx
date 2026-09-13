/* eslint-disable react-hooks/refs */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { RoutineDetailViewModel } from '../domain/routineDetail';
import {
  routineDetailService,
  type RoutineDetailService,
} from '../services/routineDetailService';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import messages from '../../../shared/message/message.json';
import '../routineDetail.css';

type RoutineDetailPageProps = { service?: RoutineDetailService };
type DetailTab = 'executionPosts' | 'customizations';

export function RoutineDetailPage({ service = routineDetailService }: RoutineDetailPageProps) {
  const { routineId = '' } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<RoutineDetailViewModel | null>(null);
  const [loadedRoutineId, setLoadedRoutineId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    service.get(routineId).then((result) => {
      if (!cancelled) {
        setRoutine(result);
        setHasError(false);
        setLoadedRoutineId(routineId);
      }
    }).catch(() => {
      if (!cancelled) {
        setRoutine(null);
        setHasError(true);
        setLoadedRoutineId(routineId);
      }
    });

    return () => { cancelled = true; };
  }, [routineId, service]);

  const isLoading = loadedRoutineId !== routineId;

  if (isLoading) {
    return <DetailState message={messages.routineDetail.loading} />;
  }

  if (hasError && loadedRoutineId === routineId) {
    return <DetailState message={messages.routineDetail.error} />;
  }

  if (!routine) {
    return <DetailState message={messages.routineDetail.notFound} />;
  }

  return <RoutineDetailContent routine={routine} service={service} />;
}

function RoutineDetailContent({ routine, service }: { routine: RoutineDetailViewModel; service: RoutineDetailService }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(routine.liked);
  const [likeCount, setLikeCount] = useState(routine.likes);
  const [activeTab, setActiveTab] = useState<DetailTab>('executionPosts');
  const [supportedPosts, setSupportedPosts] = useState<Record<string, boolean>>({});
  const [openStepMemos, setOpenStepMemos] = useState<Record<number, boolean>>({});
  const [stepsOpen, setStepsOpen] = useState(true);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const fetchExecutionPostsPage = useCallback(async (page: number) => {
    if (page === 1 && routine.executionPostsTotal !== undefined) {
      return { items: routine.executionPosts, total: routine.executionPostsTotal };
    }
    if (service.listExecutionPostsPage !== undefined) {
      return service.listExecutionPostsPage(routine.id, page, routine.steps.length);
    }
    return { items: routine.executionPosts, total: routine.executionPosts.length };
  }, [routine, service]);
  const fetchCustomizationsPage = useCallback(async (page: number) => {
    if (page === 1 && routine.customizationsTotal !== undefined) {
      return { items: routine.customizationsList, total: routine.customizationsTotal };
    }
    if (service.listCustomizationsPage !== undefined) {
      return service.listCustomizationsPage(routine.id, page);
    }
    return { items: routine.customizationsList, total: routine.customizationsList.length };
  }, [routine, service]);
  const executionPostsList = useInfiniteList({ fetchPage: fetchExecutionPostsPage, key: `routine-execution-posts-${routine.id}`, preserveWhenDisabled: true });
  const customizationsList = useInfiniteList({ fetchPage: fetchCustomizationsPage, key: `routine-customizations-${routine.id}`, preserveWhenDisabled: true });

  function toggleLike() {
    setLiked((current) => !current);
    setLikeCount((current) => liked ? current - 1 : current + 1);
  }

  function toggleSupport(postId: string) {
    setSupportedPosts((current) => ({ ...current, [postId]: !current[postId] }));
  }

  return (
    <section className="routine-detail-page">
      <header className="routine-detail-header">
        <Link className="routine-detail-header__back" to="/">
          <BackIcon />
          <span>{messages.routineDetail.backToFeed}</span>
        </Link>
        <span className="routine-detail-header__title">{messages.routineDetail.title}</span>
        <span aria-hidden="true" className="routine-detail-header__spacer" />
      </header>

      <div className="routine-detail-scroll">
        <div className="routine-detail-content">
          <div className="routine-detail-summary">
            <div className="routine-detail-author">
              <Avatar initial={routine.author.initial} />
              <div>
                <p className="routine-detail-author__name"><Link className="routine-detail-author__link" to={`/accounts/${routine.author.accountId}`}>{routine.author.name}</Link></p>
                {routine.author.handle !== '' && <p className="routine-detail-author__handle">@{routine.author.handle}</p>}
              </div>
            </div>
            <h1 className="routine-detail-summary__title">{routine.title}</h1>
            <button
              aria-controls="routine-description"
              aria-expanded={descriptionOpen}
              className="routine-detail-disclosure"
              onClick={() => setDescriptionOpen((current) => !current)}
              type="button"
            >
              <span>{messages.routineDetail.summary}</span>
              <ChevronIcon open={descriptionOpen} />
            </button>
            {descriptionOpen && <p className="routine-detail-description" id="routine-description">{routine.description}</p>}
            <div className="routine-detail-summary__stats">
              <span>{messages.routineDetail.duration} <strong>{routine.duration}</strong></span>
              <span>{messages.routineDetail.executions} <strong>{routine.executions}{messages.routineDetail.executionUnit}</strong></span>
              <span>{messages.routineDetail.customizations} <strong>{routine.customizations}</strong></span>
            </div>
            <div className="routine-detail-tags">
              {routine.tags.map((tag) => <span className="routine-detail-tag" key={tag}>{tag}</span>)}
            </div>
          </div>

          <div className="routine-detail-steps-section">
            <button
              aria-controls="routine-steps"
              aria-expanded={stepsOpen}
              className="routine-detail-steps-toggle"
              onClick={() => setStepsOpen((current) => !current)}
              type="button"
            >
              <span className="routine-detail-steps-toggle__label">
                <span>{messages.routineDetail.routineContents}</span>
                <span className="routine-detail-count">{routine.steps.length}{messages.routineDetail.itemUnit}</span>
              </span>
              <ChevronIcon open={stepsOpen} />
            </button>
            {stepsOpen && (
              <div className="routine-detail-steps" id="routine-steps">
                {routine.steps.map((step, index) => {
                  const stepMemoOpen = openStepMemos[index] ?? false;
                  const stepMemoId = `routine-step-memo-${index}`;

                  return (
                  <div className="routine-detail-step" key={`${routine.id}-${index}`}>
                    <div className="routine-detail-step__marker-column">
                      <span className="routine-detail-step__number">{index + 1}</span>
                      {index < routine.steps.length - 1 && <span className="routine-detail-step__line" />}
                    </div>
                    <div className="routine-detail-step__body">
                      <p>{step.action}</p>
                      {step.duration && <span>{step.duration}</span>}
                      {step.memo && (
                        <>
                          <button
                            aria-controls={stepMemoId}
                            aria-expanded={stepMemoOpen}
                            className="routine-detail-step__memo-toggle"
                            onClick={() => setOpenStepMemos((current) => ({ ...current, [index]: !stepMemoOpen }))}
                            type="button"
                          >
                            {messages.routineDetail.stepMemo}
                            <ChevronIcon open={stepMemoOpen} />
                          </button>
                          {stepMemoOpen && <p className="routine-detail-step__memo" id={stepMemoId}>{step.memo}</p>}
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="routine-detail-actions">
            <button
              aria-label={liked ? messages.routineDetail.unlike : messages.routineDetail.like}
              className={liked ? 'routine-detail-like routine-detail-like--liked' : 'routine-detail-like'}
              onClick={toggleLike}
              type="button"
            >
              <HeartIcon filled={liked} />
              <span>{liked ? messages.routineDetail.liked : messages.routineDetail.like}</span>
              <strong>{likeCount}</strong>
            </button>
            <div className="routine-detail-primary-actions">
              <button
                className="routine-detail-action routine-detail-action--primary"
                onClick={() => navigate(`/routines/${routine.id}/execute`)}
                type="button"
              >
                <RunIcon />
                {messages.routineDetail.execute}
              </button>
              <button
                className="routine-detail-action routine-detail-action--secondary"
                onClick={() => navigate(`/routines/${routine.id}/customize`)}
                type="button"
              >
                <CustomizeIcon />
                {messages.routineDetail.customize}
              </button>
            </div>
          </div>

          <div className="routine-detail-tabs-section">
            <div className="routine-detail-tabs" role="tablist" aria-label={messages.routineDetail.tabsAriaLabel}>
              <button
                aria-selected={activeTab === 'executionPosts'}
                className={activeTab === 'executionPosts' ? 'routine-detail-tab routine-detail-tab--active' : 'routine-detail-tab'}
                onClick={() => setActiveTab('executionPosts')}
                role="tab"
                type="button"
              >
                {messages.routineDetail.executionPostsTab}
              </button>
              <button
                aria-selected={activeTab === 'customizations'}
                className={activeTab === 'customizations' ? 'routine-detail-tab routine-detail-tab--active' : 'routine-detail-tab'}
                onClick={() => setActiveTab('customizations')}
                role="tab"
                type="button"
              >
                {messages.routineDetail.customizationsTab}
              </button>
            </div>

            {activeTab === 'executionPosts' && (
              <div className="routine-detail-post-list" role="tabpanel">
                {executionPostsList.error && executionPostsList.items.length === 0 && <DetailListError retry={executionPostsList.retry} />}
                {!executionPostsList.error && executionPostsList.items.length === 0 && <DetailEmptyState message={messages.routineDetail.executionPostsEmpty} />}
                {executionPostsList.error && executionPostsList.items.length > 0 && <DetailListError retry={executionPostsList.retry} />}
                {executionPostsList.items.map((post) => {
                  const supported = supportedPosts[post.id] ?? false;
                  return (
                    <article className="routine-detail-post" key={post.id}>
                      <div className="routine-detail-post__author">
                        <Avatar initial={post.avatar} />
                        <div>
                          <p>{post.userName}</p>
                          <span>{post.date}</span>
                        </div>
                      </div>
                      <div className="routine-detail-post__metrics">
                        <span>{messages.routineDetail.achieved} <strong>{post.achieved} / {post.total} {messages.routineDetail.itemUnit}</strong></span>
                      </div>
                      {post.comment && <p className="routine-detail-post__comment">「{post.comment}」</p>}
                      <button
                        aria-label={`${supported ? messages.routineDetail.supported : messages.routineDetail.support} ${post.userName}`}
                        className={supported ? 'routine-detail-support routine-detail-support--supported' : 'routine-detail-support'}
                        onClick={() => toggleSupport(post.id)}
                        type="button"
                      >
                        <SupportIcon filled={supported} />
                        <span>{supported ? messages.routineDetail.supported : messages.routineDetail.support}</span>
                        <strong>{post.cheers + (supported ? 1 : 0)}</strong>
                      </button>
                    </article>
                  );
                })}
                {executionPostsList.items.length > 0 && <div aria-label="さらに読み込む" ref={executionPostsList.sentinelRef} />}
              </div>
            )}

            {activeTab === 'customizations' && (
              <div className="routine-detail-customization-list" role="tabpanel">
                {customizationsList.error && customizationsList.items.length === 0 && <DetailListError retry={customizationsList.retry} />}
                {!customizationsList.error && customizationsList.items.length === 0 && <DetailEmptyState message={messages.routineDetail.customizationsEmpty} />}
                {customizationsList.error && customizationsList.items.length > 0 && <DetailListError retry={customizationsList.retry} />}
                {customizationsList.items.map((customization) => (
                  <article className="routine-detail-customization" key={customization.id}>
                    <p className="routine-detail-customization__author">{messages.routineDetail.customizationVersion} — {customization.authorName}</p>
                    <h2><Link to={`/routines/${customization.id}`}>{customization.title}</Link></h2>
                    {customization.description !== '' && <p>{customization.description}</p>}
                  </article>
                ))}
                {customizationsList.items.length > 0 && <div aria-label="さらに読み込む" ref={customizationsList.sentinelRef} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailState({ message }: { message: string }) {
  return (
    <section className="routine-detail-page routine-detail-page--state">
      <Link className="routine-detail-header__back" to="/">
        <BackIcon />
        <span>{messages.routineDetail.backToFeed}</span>
      </Link>
      <p className="routine-detail-state">{message}</p>
    </section>
  );
}

function DetailEmptyState({ message }: { message: string }) {
  return <p className="routine-detail-empty">{message}</p>;
}

function DetailListError({ retry }: { retry: () => void }) {
  return <p className="routine-detail-empty routine-detail-empty--error">{messages.routineDetail.error} <button onClick={retry} type="button">再試行</button></p>;
}

function Avatar({ initial }: { initial: string }) {
  const avatarClasses: Record<string, string> = {
    H: 'routine-detail-avatar--h',
    N: 'routine-detail-avatar--n',
    S: 'routine-detail-avatar--s',
    T: 'routine-detail-avatar--t',
    Y: 'routine-detail-avatar--y',
  };

  return <span aria-hidden="true" className={`routine-detail-avatar ${avatarClasses[initial] ?? 'routine-detail-avatar--default'}`}>{initial}</span>;
}

function BackIcon() {
  return <svg aria-hidden="true" className="routine-detail-icon" fill="none" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return <svg aria-hidden="true" className={open ? 'routine-detail-chevron routine-detail-chevron--open' : 'routine-detail-chevron'} fill="none" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return <svg aria-hidden="true" className="routine-detail-icon" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></svg>;
}

function SupportIcon({ filled }: { filled: boolean }) {
  return <svg aria-hidden="true" className="routine-detail-small-icon" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2H14Z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>;
}

function RunIcon() {
  return <svg aria-hidden="true" className="routine-detail-small-icon" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>;
}

function CustomizeIcon() {
  return <svg aria-hidden="true" className="routine-detail-small-icon" fill="none" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8" /><line x1="4" x2="21" y1="20" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" x2="21" y1="15" y2="21" /><line x1="4" x2="9" y1="4" y2="9" /></svg>;
}
