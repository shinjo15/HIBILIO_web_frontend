import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HibilioMark } from '../../../shared/brand/HibilioMark';
import messages from '../../../shared/message/message.json';
import { RoutineCreateForm } from '../components/RoutineCreateForm';
import type { RoutineCreateViewModel } from '../domain/routineCreate';
import { useRoutineCreate } from '../hooks/useRoutineCreate';
import { routineCreateService, type RoutineCreateService } from '../services/routineCreateService';
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
  const copy = mode === 'customize' ? messages.routineCustomize : messages.routineCreate;
  const canSubmit = routineCreate.form.routineName.trim() !== ''
    && routineCreate.form.actions.every((action) => action.actionName.trim() !== '');

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('routine-create-submission-state', { detail: { canSubmit } }));

    return () => {
      window.dispatchEvent(new CustomEvent('routine-create-submission-state', { detail: { canSubmit: false } }));
    };
  }, [canSubmit]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void routineCreate.submit();
  }

  return (
    <section className="routine-create-page">
      <header className="routine-create-header">
        <Link aria-label={messages.routineCreate.backToFeed} className="routine-create-header__back" to={returnPath}>
          <BackIcon />
        </Link>
        <h1 className="routine-create-header__title">{copy.title}</h1>
        <button
          className="routine-create-header__submit"
          disabled={!canSubmit || routineCreate.status === 'submitting'}
          form="routine-create-form"
          type="submit"
        >
          <SendIcon />
          {routineCreate.status === 'submitting' ? messages.routineCreate.submitting : messages.routineCreate.submit}
        </button>
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
            onSubmit={handleSubmit}
            onUpdateAction={routineCreate.updateAction}
            onUpdateField={routineCreate.updateField}
          />
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

function BackIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="none" height="20" viewBox="0 0 24 24" width="20"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function SendIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="currentColor" height="15" viewBox="0 0 24 24" width="15"><path d="M3.4 2.7 21.3 11a1 1 0 0 1 0 1.8L3.4 21.3a.75.75 0 0 1-1-.9l2.3-6.7a.75.75 0 0 1 .7-.5H14a.75.75 0 0 0 0-1.5H5.4a.75.75 0 0 1-.7-.5L2.4 3.6a.75.75 0 0 1 1-.9Z" /></svg>;
}
