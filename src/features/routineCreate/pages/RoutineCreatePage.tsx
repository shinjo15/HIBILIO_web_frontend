import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HibilioMark } from '../../../shared/brand/HibilioMark';
import messages from '../../../shared/message/message.json';
import { RoutineCreateForm } from '../components/RoutineCreateForm';
import { useRoutineCreate } from '../hooks/useRoutineCreate';
import { routineCreateService, type RoutineCreateService } from '../services/routineCreateService';
import '../routineCreate.css';

type RoutineCreatePageProps = {
  service?: RoutineCreateService;
};

export function RoutineCreatePage({ service = routineCreateService }: RoutineCreatePageProps) {
  const navigate = useNavigate();
  const routineCreate = useRoutineCreate(service);
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

    const timeoutId = window.setTimeout(() => navigate('/'), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [navigate, routineCreate.status]);

  if (routineCreate.status === 'success') {
    return <RoutineCreateSuccess />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void routineCreate.submit();
  }

  return (
    <section className="routine-create-page">
      <header className="routine-create-header">
        <Link aria-label={messages.routineCreate.backToFeed} className="routine-create-header__back" to="/">
          <CloseIcon />
        </Link>
        <h1 className="routine-create-header__title">{messages.routineCreate.title}</h1>
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
            onSubmit={handleSubmit}
            onUpdateAction={routineCreate.updateAction}
            onUpdateField={routineCreate.updateField}
          />
        </div>
      </main>
    </section>
  );
}

function RoutineCreateSuccess() {
  return (
    <section className="routine-create-page routine-create-page--success">
      <header className="routine-create-header">
        <Link aria-label={messages.routineCreate.backToFeed} className="routine-create-header__back" to="/">
          <CloseIcon />
        </Link>
        <h1 className="routine-create-header__title">{messages.routineCreate.title}</h1>
        <span aria-hidden="true" className="routine-create-header__spacer" />
      </header>
      <main className="routine-create-state">
        <HibilioMark size={48} />
        <h2>{messages.routineCreate.success}</h2>
        <p>{messages.routineCreate.successDescription}</p>
        <Link className="routine-create-state__link" to="/">{messages.routineCreate.backToFeed}</Link>
      </main>
    </section>
  );
}

function CloseIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="none" height="20" viewBox="0 0 24 24" width="20"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}
