import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import type { RoutineDetailViewModel } from '../../routineDetail/domain/routineDetail';
import {
  routineDetailService,
  type RoutineDetailService,
} from '../../routineDetail/services/routineDetailService';
import { createCustomizedRoutineViewModel } from '../domain/routineCreate';
import { RoutineCreatePage } from './RoutineCreatePage';
import { routineCreateService, type RoutineCreateService } from '../services/routineCreateService';
import { NotFoundPage } from '../../../shared/pages/NotFoundPage';

type CustomizedRoutineCreatePageProps = {
  detailService?: RoutineDetailService;
  service?: RoutineCreateService;
};

export function CustomizedRoutineCreatePage({
  detailService = routineDetailService,
  service = routineCreateService,
}: CustomizedRoutineCreatePageProps) {
  const { routineId = '' } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<RoutineDetailViewModel | null>(null);
  const [status, setStatus] = useState<'loading' | 'notFound' | 'error' | 'ready'>('loading');

  useEffect(() => {
    let cancelled = false;

    detailService.get(routineId).then((result) => {
      if (cancelled) {
        return;
      }

      if (result === null) {
        setStatus('notFound');
        return;
      }

      setRoutine(result);
      setStatus('ready');
    }).catch(() => {
      if (!cancelled) {
        setStatus('error');
      }
    });

    return () => { cancelled = true; };
  }, [detailService, routineId]);

  if (status === 'notFound') {
    return <NotFoundPage />;
  }

  if (status !== 'ready' || routine === null) {
    const message = status === 'error' ? messages.routineCustomize.error : messages.routineCustomize.loading;

    return (
      <section className="routine-create-page routine-create-page--state">
        <Link className="routine-create-header__back" to={`/routines/${routineId}`}>{messages.routineDetail.backToFeed}</Link>
        <p className="routine-create-state">{message}</p>
      </section>
    );
  }

  return (
    <RoutineCreatePage
      initialForm={createCustomizedRoutineViewModel({
        description: routine.description,
        durationMinutes: routine.durationMinutes ?? undefined,
        id: routine.id,
        steps: routine.steps,
        title: routine.title,
      })}
      mode="customize"
      returnPath={`/routines/${routineId}`}
      service={service}
    />
  );
}
