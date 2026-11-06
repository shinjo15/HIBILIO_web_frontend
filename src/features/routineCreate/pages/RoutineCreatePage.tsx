import type { FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HibilioMark } from '../../../shared/brand/HibilioMark';
import messages from '../../../shared/message/message.json';
import { clearAuthenticated } from '../../auth/services/authSession';
import { RoutineCreateForm } from '../components/RoutineCreateForm';
import type { RoutineCreateViewModel } from '../domain/routineCreate';
import { useRoutineCreate } from '../hooks/useRoutineCreate';
import {
  RoutineCreateUnauthorizedError,
  routineCreateService,
  type RoutineCreateService,
  type RoutineCreateTag,
} from '../services/routineCreateService';
import '../routineCreate.css';

type RoutineCreatePageProps = {
  initialForm?: RoutineCreateViewModel;
  mode?: 'create' | 'customize';
  returnPath?: string;
  service?: RoutineCreateService;
};

export function RoutineCreatePage({
  initialForm,
  mode = 'create',
  returnPath = '/',
  service = routineCreateService,
}: RoutineCreatePageProps) {
  const navigate = useNavigate();
  const routineCreate = useRoutineCreate(service, initialForm);
  const [favoriteTags, setFavoriteTags] = useState<RoutineCreateTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<RoutineCreateTag[]>([]);
  const [tagCandidates, setTagCandidates] = useState<RoutineCreateTag[]>([]);
  const [tagQuery, setTagQuery] = useState('');
  const [favoriteTagLoadError, setFavoriteTagLoadError] = useState<string | null>(null);
  const [tagSearchLoadError, setTagSearchLoadError] = useState<string | null>(null);
  const [tagReloadVersion, setTagReloadVersion] = useState(0);
  const [submitGuideState, setSubmitGuideState] = useState<'visible' | 'fading' | 'hidden'>('visible');
  const submitGuideId = useId();
  const searchRequestId = useRef(0);
  const tagQueryRef = useRef(tagQuery);
  const copy = mode === 'customize' ? messages.routineCustomize : messages.routineCreate;
  const canSubmit = routineCreate.form.routineName.trim() !== ''
    && routineCreate.form.actions.every((action) => action.actionName.trim() !== '')
    && !['submitting', 'loading', 'success'].includes(routineCreate.status);
  const visibleTagCandidates = [...selectedTags, ...(tagQuery.trim() === '' ? favoriteTags : tagCandidates)]
    .filter((tag, index, tags) => tags.findIndex((item) => item.identifier === tag.identifier) === index);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('routine-create-submission-state', { detail: { canSubmit } }));

    return () => {
      window.dispatchEvent(new CustomEvent('routine-create-submission-state', { detail: { canSubmit: false } }));
    };
  }, [canSubmit]);

  useEffect(() => {
    const fadeTimeoutId = window.setTimeout(() => setSubmitGuideState('fading'), 5_000);
    const removeTimeoutId = window.setTimeout(() => setSubmitGuideState('hidden'), 5_300);
    return () => {
      window.clearTimeout(fadeTimeoutId);
      window.clearTimeout(removeTimeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    service.loadFavoriteTags?.()
      .then((favoriteTags) => {
        if (cancelled) return;
        setFavoriteTagLoadError(null);
        setFavoriteTags(favoriteTags);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof RoutineCreateUnauthorizedError) {
          clearAuthenticated();
          navigate('/login');
          return;
        }
        setFavoriteTagLoadError(messages.routineCreate.favoriteTagLoadError);
      });
    return () => { cancelled = true; };
  }, [navigate, service, tagReloadVersion]);

  useEffect(() => {
    const query = tagQuery.trim();
    if (query === '') return;
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    const timeoutId = window.setTimeout(() => {
      service.searchTagCandidates?.(query)
        .then((tags) => {
          if (searchRequestId.current !== requestId) return;
          setTagCandidates(tags);
          setTagSearchLoadError(null);
        })
        .catch(() => {
          if (searchRequestId.current !== requestId) return;
          setTagCandidates([]);
          setTagSearchLoadError(messages.routineCreate.tagLoadError);
        });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [service, tagQuery, tagReloadVersion]);

  useEffect(() => {
    if (!routineCreate.isUnauthorized) return;
    clearAuthenticated();
    navigate('/login');
  }, [navigate, routineCreate.isUnauthorized]);

  useEffect(() => {
    if (routineCreate.status !== 'success') {
      return;
    }

    const timeoutId = window.setTimeout(() => navigate(returnPath), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [navigate, returnPath, routineCreate.status]);

  if (routineCreate.status === 'success') {
    return <RoutineCreateSuccess copy={copy} returnPath={returnPath} />;
  }

  if (routineCreate.status === 'loading') {
    return <RoutineCreateLoading />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void routineCreate.submit();
  }

  function retryTagLoad() {
    setTagReloadVersion((version) => version + 1);
  }

  function toggleTag(tag: RoutineCreateTag) {
    const isSelected = (routineCreate.form.tagIdentifiers ?? []).includes(tag.identifier);
    if (isSelected) {
      setSelectedTags((tags) => tags.filter((item) => item.identifier !== tag.identifier));
    } else {
      setSelectedTags((tags) => [...tags.filter((item) => item.identifier !== tag.identifier), tag]);
    }
    routineCreate.toggleTag(tag.identifier);
  }

  function updateTagQuery(query: string) {
    if (tagQueryRef.current === query) return;
    tagQueryRef.current = query;
    searchRequestId.current += 1;
    setTagCandidates([]);
    setTagSearchLoadError(null);
    setTagQuery(query);
  }

  return (
    <section className="routine-create-page">
      <header className="routine-create-header">
        <Link aria-label={messages.routineCreate.backToFeed} className="routine-create-header__back" to={returnPath}>
          <BackIcon />
          <span>{messages.routineCreate.back}</span>
        </Link>
        <h1 className="routine-create-header__title">{copy.title}</h1>
        <span aria-hidden="true" className="routine-create-header__spacer" />
      </header>

      <main className="routine-create-scroll">
        <div className="routine-create-content">
          <RoutineCreateForm
            errorMessage={routineCreate.errorMessage}
            form={routineCreate.form}
            isSubmitting={routineCreate.status === 'submitting'}
            onAddAction={routineCreate.addAction}
            onMoveAction={routineCreate.moveAction}
            onRemoveAction={routineCreate.removeAction}
            onRetryTagLoad={retryTagLoad}
            onSubmit={handleSubmit}
            onToggleTag={toggleTag}
            onUpdateAction={routineCreate.updateAction}
            onUpdateField={routineCreate.updateField}
            onUpdateTagQuery={updateTagQuery}
            tagCandidates={visibleTagCandidates}
            tagLoadError={tagSearchLoadError ?? favoriteTagLoadError}
            tagQuery={tagQuery}
          />
          <div className="routine-create-desktop-submit">
            <div className="routine-create-desktop-submit__control">
              <button aria-describedby={submitGuideState !== 'hidden' ? submitGuideId : undefined} className="routine-create-desktop-submit__button routine-create-desktop-submit__button--attention" disabled={!canSubmit} form="routine-create-form" type="submit">
                {routineCreate.status === 'submitting' ? messages.routineCreate.submitting : messages.routineCreate.submit}
              </button>
              {submitGuideState !== 'hidden' && (
                <div aria-live="polite" className={`routine-create-desktop-submit__guide${submitGuideState === 'fading' ? ' routine-create-desktop-submit__guide--fading' : ''}`} id={submitGuideId} role="tooltip">
                  <span>{messages.routineCreate.submitGuide}</span>
                  {!canSubmit && <small>{messages.routineCreate.submitDisabledGuide}</small>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}

function RoutineCreateSuccess({
  copy,
  returnPath,
}: {
  copy: typeof messages.routineCreate | typeof messages.routineCustomize;
  returnPath: string;
}) {
  return (
    <section className="routine-create-page routine-create-page--success">
      <header className="routine-create-header">
        <Link aria-label={messages.routineCreate.backToFeed} className="routine-create-header__back" to={returnPath}>
          <BackIcon />
          <span>{messages.routineCreate.back}</span>
        </Link>
        <h1 className="routine-create-header__title">{copy.title}</h1>
        <span aria-hidden="true" className="routine-create-header__spacer" />
      </header>
      <main className="routine-create-state">
        <HibilioMark size={48} />
        <h2>{copy.success}</h2>
        <p>{copy.successDescription}</p>
        <Link className="routine-create-state__link" to={returnPath}>{messages.routineCreate.backToFeed}</Link>
      </main>
    </section>
  );
}

function RoutineCreateLoading() {
  return (
    <section className="routine-create-loading">
      <span className="routine-create-loading__mark"><HibilioMark size={56} /></span>
      <p>{messages.routineCreate.submitting}</p>
    </section>
  );
}

function BackIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="none" height="20" viewBox="0 0 24 24" width="20"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
