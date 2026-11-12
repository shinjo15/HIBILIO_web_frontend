/* eslint-disable react-hooks/refs */
import { Tab, Tabs } from '@mui/material';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountService, AccountUnauthorizedError, type AccountService } from '../../account/services/accountService';
import { clearAuthenticated, getAuthenticationGeneration, getAuthenticationStatus, restoreAuthentication, subscribeToAuthentication } from '../../auth/services/authSession';
import { RoutineCard } from '../../routineFeed/components/RoutineCard';
import { routineLikeService, RoutineLikeUnauthorizedError, type RoutineLikeService } from '../../routineFeed/services/routineLikeService';
import { ExecutionHistoryCard } from '../../../shared/components/ExecutionHistoryCard';
import type { AccountExecutionSummary, AccountRoutine } from '../../account/domain/account';
import { AccountAvatar } from '../../../shared/components/AccountImage';
import { AppBrandHeader } from '../../../shared/components/AppBrandHeader';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import messages from '../../../shared/message/message.json';
import { buildCalendarMonth, groupExecutionHistoriesByLocalDate, isCalendarDayFuture, isCalendarDayToday, shiftCalendarMonth } from '../services/executionCalendar';
import '../../account/account.css';
import '../../routineFeed/routineFeed.css';
import '../../routineFeed/routineFeedTypography.css';
import './home.css';

type HomePageProps = { likeService?: RoutineLikeService; service?: AccountService };
type HomeProfile = Awaited<ReturnType<AccountService['getProfile']>>;
type HomeRoutineTab = 'likes' | 'recentExecutions' | 'mostExecuted';

const homeRoutineTabs: Array<{ label: string; value: HomeRoutineTab }> = [
  { label: messages.home.likedRoutines, value: 'likes' },
  { label: messages.home.recentExecutedRoutines, value: 'recentExecutions' },
  { label: messages.home.mostExecutedRoutines, value: 'mostExecuted' },
];

export function HomePage({ likeService = routineLikeService, service = accountService }: HomePageProps) {
  const navigate = useNavigate();
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);
  const authenticationGeneration = useSyncExternalStore(subscribeToAuthentication, getAuthenticationGeneration, getAuthenticationGeneration);
  const isDesktop = useDesktopLayout();
  const [profile, setProfile] = useState<{ generation: number; value: HomeProfile } | null>(null);
  const likeOverridesRef = useRef(new Map<string, { liked: boolean; likes: number }>());

  useEffect(() => {
    if (authenticationStatus === 'loading') void restoreAuthentication();
  }, [authenticationStatus]);

  const handleUnauthorized = useCallback((error: unknown) => {
    if (error instanceof AccountUnauthorizedError && getAuthenticationGeneration() === authenticationGeneration) {
      clearAuthenticated();
      navigate('/login', { replace: true });
    }
  }, [authenticationGeneration, navigate]);
  const applyLikeOverrides = useCallback(<Item extends AccountRoutine>(items: Item[]): Item[] => items.map((item) => {
    if (item.id === null || item.liked === null || item.likes === null) return item;
    const override = likeOverridesRef.current.get(item.id);
    return override === undefined ? item : { ...item, ...override };
  }), []);
  const fetchLikesPage = useCallback(async (page: number) => {
    if (service.listLikesPage !== undefined) {
      const result = await service.listLikesPage(page);
      return { ...result, items: applyLikeOverrides(result.items) };
    }
    const items = await service.listLikes();
    return { items: applyLikeOverrides(items), total: items.length };
  }, [applyLikeOverrides, service]);
  const fetchRecentExecutedRoutinesPage = useCallback(async (page: number) => {
    if (service.listRecentExecutedRoutinesPage !== undefined) {
      const result = await service.listRecentExecutedRoutinesPage(page);
      return { ...result, items: applyLikeOverrides(result.items) };
    }
    return { items: [], total: 0 };
  }, [applyLikeOverrides, service]);
  const fetchMostExecutedRoutinesPage = useCallback(async (page: number) => {
    if (service.listMostExecutedRoutinesPage !== undefined) {
      const result = await service.listMostExecutedRoutinesPage(page);
      return { ...result, items: applyLikeOverrides(result.items) };
    }
    return { items: [], total: 0 };
  }, [applyLikeOverrides, service]);
  const fetchExecutionHistoryPage = useCallback(async (page: number) => {
    if (service.listExecutionHistoriesPage !== undefined) return service.listExecutionHistoriesPage(page);
    const items = await service.listExecutionHistories();
    return { items, total: items.length };
  }, [service]);
  const enabled = authenticationStatus === 'authenticated';
  const [activeRoutineTab, setActiveRoutineTab] = useState<HomeRoutineTab>('likes');
  const [historyScrollRoot, setHistoryScrollRoot] = useState<Element | null>(null);
  const likes = useInfiniteList({ enabled, fetchPage: fetchLikesPage, key: `home-likes-${authenticationGeneration}`, onError: handleUnauthorized });
  const recentExecutedRoutines = useInfiniteList({ enabled: enabled && activeRoutineTab === 'recentExecutions', fetchPage: fetchRecentExecutedRoutinesPage, key: `home-recent-executions-${authenticationGeneration}`, onError: handleUnauthorized, preserveWhenDisabled: true });
  const mostExecutedRoutines = useInfiniteList({ enabled: enabled && activeRoutineTab === 'mostExecuted', fetchPage: fetchMostExecutedRoutinesPage, key: `home-most-executed-${authenticationGeneration}`, onError: handleUnauthorized, preserveWhenDisabled: true });
  const histories = useInfiniteList({ enabled, fetchPage: fetchExecutionHistoryPage, key: `home-execution-histories-${authenticationGeneration}`, observerRoot: historyScrollRoot, onError: handleUnauthorized });

  useEffect(() => {
    if (authenticationStatus !== 'authenticated') return;
    let cancelled = false;

    service.getProfile().then((nextProfile) => {
      if (!cancelled) setProfile({ generation: authenticationGeneration, value: nextProfile });
    }).catch((error: unknown) => {
      if (cancelled) return;
      if (error instanceof AccountUnauthorizedError) {
        clearAuthenticated();
        navigate('/login', { replace: true });
      }
    });

    return () => { cancelled = true; };
  }, [authenticationGeneration, authenticationStatus, navigate, service]);

  const [likingPostIdentifiers, setLikingPostIdentifiers] = useState<ReadonlySet<string>>(() => new Set());
  const [likeAnimations, setLikeAnimations] = useState<ReadonlyMap<string, 'like' | 'unlike'>>(() => new Map());
  const [likeError, setLikeError] = useState(false);

  useEffect(() => {
    likeOverridesRef.current.clear();
  }, [authenticationGeneration]);

  function updateRoutineItems(update: (items: AccountRoutine[]) => AccountRoutine[]) {
    likes.setItems((items) => update(items) as typeof items);
    recentExecutedRoutines.setItems(update);
    mostExecutedRoutines.setItems(update);
  }

  async function toggleLike(tab: HomeRoutineTab, postIdentifier: string) {
    const routine = (tab === 'likes' ? likes.items : tab === 'recentExecutions' ? recentExecutedRoutines.items : mostExecutedRoutines.items).find((item) => item.id === postIdentifier);
    if (routine === undefined || routine.liked === null || routine.likes === null) return;
    const requestGeneration = authenticationGeneration;

    const type = routine.liked ? 'unlike' : 'like';
    const previousLikeOverride = likeOverridesRef.current.get(postIdentifier);
    const nextLikeOverride = { liked: !routine.liked, likes: routine.likes + (routine.liked ? -1 : 1) };
    likeOverridesRef.current.set(postIdentifier, nextLikeOverride);
    setLikingPostIdentifiers((current) => new Set(current).add(postIdentifier));
    setLikeAnimations((current) => new Map(current).set(postIdentifier, type));
    setLikeError(false);
    updateRoutineItems((current) => current.map((item) => item.id === postIdentifier && item.liked !== null && item.likes !== null ? { ...item, ...nextLikeOverride } : item));

    try {
      if (routine.liked) await likeService.remove(postIdentifier);
      else await likeService.create(postIdentifier);
    } catch (error) {
      if (getAuthenticationGeneration() === requestGeneration) {
        if (previousLikeOverride === undefined) likeOverridesRef.current.delete(postIdentifier);
        else likeOverridesRef.current.set(postIdentifier, previousLikeOverride);
        updateRoutineItems((current) => current.map((item) => item.id === postIdentifier ? routine : item));
        if (error instanceof RoutineLikeUnauthorizedError) {
          clearAuthenticated();
          navigate('/login', { replace: true });
        } else {
          setLikeError(true);
        }
      }
    } finally {
      if (getAuthenticationGeneration() === requestGeneration) {
        setLikingPostIdentifiers((current) => {
          const next = new Set(current);
          next.delete(postIdentifier);
          return next;
        });
        setLikeAnimations((current) => {
          const next = new Map(current);
          next.delete(postIdentifier);
          return next;
        });
      }
    }
  }

  function renderRoutineList(tab: HomeRoutineTab, routines: ReturnType<typeof useInfiniteList<AccountRoutine>>) {
    const labels = tab === 'likes'
      ? { empty: messages.account.likesEmpty, error: messages.account.likesError, loading: messages.account.likesLoading, title: messages.home.likedRoutines }
      : tab === 'recentExecutions'
        ? { empty: messages.home.recentExecutedRoutinesEmpty, error: messages.home.recentExecutedRoutinesError, loading: messages.home.recentExecutedRoutinesLoading, title: messages.home.recentExecutedRoutines }
        : { empty: messages.home.mostExecutedRoutinesEmpty, error: messages.home.mostExecutedRoutinesError, loading: messages.home.mostExecutedRoutinesLoading, title: messages.home.mostExecutedRoutines };

    return <>
      {routines.isInitialLoading && <p className="home-page__state">{labels.loading}</p>}
      {!routines.isInitialLoading && routines.error && <StateError message={labels.error} retry={routines.retry} />}
      {!routines.isInitialLoading && !routines.error && routines.items.length === 0 && <p className="home-page__state">{labels.empty}</p>}
      {!routines.isInitialLoading && routines.items.length > 0 && <>
        {likeError && <p className="home-page__state home-page__state--error">{messages.routineFeed.likeError}</p>}
        <div aria-label={labels.title} className="home-page__likes-scroll routine-feed-card-scope">
          {routines.items.map((routine) => <RoutineCard isLiking={routine.id !== null && likingPostIdentifiers.has(routine.id)} key={routine.id ?? routine.routineId} likeAnimation={routine.id === null ? null : likeAnimations.get(routine.id) ?? null} myExecutionCount={tab === 'likes' ? undefined : routine.myExecutionCount} onLike={(postIdentifier) => toggleLike(tab, postIdentifier)} routine={routine} />)}
          <div aria-label={messages.home.loadMore} className="home-page__horizontal-sentinel" ref={routines.sentinelRef} />
        </div>
      </>}
    </>;
  }

  if (authenticationStatus === 'loading') return <p className="home-page__state" role="status">{messages.home.loading}</p>;
  if (authenticationStatus === 'unauthenticated') {
    return <main className="home-page home-page--guest"><header className="home-page__header"><AppBrandHeader /></header><div className="home-page__content"><section className="home-page__guest"><h1>{messages.home.guestTitleBeforeBreak}<br />{messages.home.guestTitleAfterBreak}</h1><p>{messages.home.guestDescription}</p><p className="home-page__guest-note">{messages.home.guestNote}</p><Link className="home-page__login" to="/login">{messages.auth.login}</Link></section></div></main>;
  }

  const displayedProfile = profile?.generation === authenticationGeneration ? profile.value : null;

  return (
    <main className="home-page">
      <header className="home-page__header"><AppBrandHeader /></header>
      <div className="home-page__content">
        {displayedProfile !== null && <header className="home-page__profile"><AccountAvatar className="home-page__profile-avatar" iconImageUrl={displayedProfile.iconImageUrl ?? null} initial={displayedProfile.initial} /><div className="home-page__profile-copy"><div className="home-page__profile-name-row"><span className="home-page__profile-name">{displayedProfile.name}</span>{displayedProfile.level !== undefined && <span className="account-profile__level">{messages.account.level} {displayedProfile.level}</span>}</div>{displayedProfile.bio !== null && displayedProfile.bio !== '' && <span className="home-page__profile-bio">{displayedProfile.bio}</span>}</div></header>}
        <section aria-labelledby="home-liked-routines-title" className="home-page__section">
          <h1 id="home-liked-routines-title">{messages.home.routineTitle}</h1>
          <Tabs aria-label={messages.home.routineTabsAriaLabel} className="home-page__routine-tabs routine-feed-tabs" onChange={(_, value: HomeRoutineTab) => setActiveRoutineTab(value)} value={activeRoutineTab}>
            {homeRoutineTabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
          </Tabs>
          {activeRoutineTab === 'likes' && renderRoutineList('likes', likes as ReturnType<typeof useInfiniteList<AccountRoutine>>)}
          {activeRoutineTab === 'recentExecutions' && renderRoutineList('recentExecutions', recentExecutedRoutines)}
          {activeRoutineTab === 'mostExecuted' && renderRoutineList('mostExecuted', mostExecutedRoutines)}
        </section>
        <section aria-labelledby="home-execution-history-title" className="home-page__section">
          <h2 id="home-execution-history-title">{messages.home.executionHistory}</h2>
          {histories.isInitialLoading && <p className="home-page__state">{messages.home.executionHistoryLoading}</p>}
          {!histories.isInitialLoading && histories.error && <StateError message={messages.home.executionHistoryError} retry={histories.retry} />}
          {!histories.isInitialLoading && !histories.error && histories.items.length === 0 && <p className="home-page__state">{messages.account.executionHistoryEmpty}</p>}
          {!histories.isInitialLoading && histories.items.length > 0 && (isDesktop
            ? <ExecutionHistoryCalendar hasError={histories.error} histories={histories.items} onRequestOlder={histories.loadNextPage} onSelect={(selected) => navigate(`/routines/${selected.routineId}/executions/${selected.id}`)} sentinelRef={histories.sentinelRef} />
            : <MobileExecutionHistoryCalendar histories={histories.items} onScrollRoot={setHistoryScrollRoot} onSelect={(selected) => navigate(`/routines/${selected.routineId}/executions/${selected.id}`)} sentinelRef={histories.sentinelRef} />)}
        </section>
      </div>
    </main>
  );
}

function ExecutionHistoryCalendar({ hasError, histories, onRequestOlder, onSelect, sentinelRef }: { hasError: boolean; histories: AccountExecutionSummary[]; onRequestOlder: () => void; onSelect: (history: AccountExecutionSummary) => void; sentinelRef: (element: Element | null) => void | (() => void) }) {
  const today = useCurrentLocalDate();
  const [month, setMonth] = useState(() => ({ month: today.getMonth() + 1, year: today.getFullYear() }));
  const { dated, undated } = groupExecutionHistoriesByLocalDate(histories);
  const calendar = buildCalendarMonth(month);
  const title = `${month.year}年${month.month}月`;
  const isCurrentMonth = month.year === today.getFullYear() && month.month === today.getMonth() + 1;
  useEffect(() => {
    if (!hasError && isBeforeOldestLoadedMonth(month, histories)) onRequestOlder();
  }, [hasError, histories, month, onRequestOlder]);
  const moveMonth = (amount: -1 | 1) => setMonth((current) => {
    const next = amount === 1 && current.year === today.getFullYear() && current.month === today.getMonth() + 1 ? current : shiftCalendarMonth(current, amount);
    if (amount === -1 && isBeforeOldestLoadedMonth(next, histories)) onRequestOlder();
    return next;
  });

  return <div className="home-page__history-desktop">
    <div aria-label={`${messages.home.calendarTitle} ${title}`} className="home-page__calendar" role="grid">
      <div className="home-page__calendar-header"><button aria-label={messages.home.calendarPreviousMonth} onClick={() => moveMonth(-1)} onKeyDown={(event) => { if (event.key === 'ArrowLeft') moveMonth(-1); }} type="button">‹</button><h3>{title}</h3><button aria-label={messages.home.calendarNextMonth} disabled={isCurrentMonth} onClick={() => moveMonth(1)} onKeyDown={(event) => { if (event.key === 'ArrowRight') moveMonth(1); }} type="button">›</button></div>
      <div className="home-page__calendar-weekdays" role="row">{calendar.weekdays.map((weekday) => <span key={weekday} role="columnheader">{weekday}</span>)}</div>
      <CalendarDays dated={dated} days={calendar.days} onSelect={onSelect} today={today} />

    </div>
    {undated.length > 0 && <div className="home-page__undated"><h3>{messages.home.executionHistoryUndatedTitle}</h3><p className="home-page__calendar-note">{messages.home.executionHistoryUndated}</p><ExecutionHistoryList histories={undated} onSelect={onSelect} /></div>}
    <div aria-label={messages.home.loadMore} className="home-page__history-sentinel" ref={sentinelRef} />
  </div>;
}

const mobileCalendarInitialMonthCount = 6;

function MobileExecutionHistoryCalendar({ histories, onScrollRoot, onSelect, sentinelRef }: { histories: AccountExecutionSummary[]; onScrollRoot: (element: Element | null) => void; onSelect: (history: AccountExecutionSummary) => void; sentinelRef: (element: Element | null) => void | (() => void) }) {
  const today = useCurrentLocalDate();
  const currentMonth = { month: today.getMonth() + 1, year: today.getFullYear() };
  const [firstMonth, setFirstMonth] = useState(() => shiftCalendarMonth(currentMonth, 1 - mobileCalendarInitialMonthCount));
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLDivElement>(null);
  const positionedInitialMonth = useRef(false);
  const pendingScrollAnchor = useRef<{ key: string; offset: number } | null>(null);
  const setScrollArea = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element;
    onScrollRoot(element);
  }, [onScrollRoot]);
  const { dated, undated } = groupExecutionHistoriesByLocalDate(histories);
  const monthCount = (currentMonth.year - firstMonth.year) * 12 + currentMonth.month - firstMonth.month + 1;
  const months = Array.from({ length: monthCount }, (_, index) => shiftCalendarMonth(firstMonth, index));

  useEffect(() => {
    if (positionedInitialMonth.current || scrollRef.current === null || currentMonthRef.current === null) return;
    scrollRef.current.scrollTop = currentMonthRef.current.offsetTop - scrollRef.current.offsetTop;
    positionedInitialMonth.current = true;
  }, []);

  useLayoutEffect(() => {
    const pending = pendingScrollAnchor.current;
    const scrollArea = scrollRef.current;
    if (pending === null || scrollArea === null) return;
    const anchor = scrollArea.querySelector<HTMLElement>(`[data-calendar-month="${pending.key}"]`);
    if (anchor !== null) scrollArea.scrollTop = anchor.offsetTop - pending.offset;
    pendingScrollAnchor.current = null;
  }, [firstMonth]);

  function moveVisibleMonths() {
    const scrollArea = scrollRef.current;
    const monthElements = Array.from(scrollArea?.querySelectorAll<HTMLElement>('[data-calendar-month]') ?? []);
    const anchor = monthElements.find((element) => element.offsetTop + element.offsetHeight > (scrollArea?.scrollTop ?? 0)) ?? monthElements[0];
    if (scrollArea !== null && anchor !== undefined) {
      pendingScrollAnchor.current = { key: anchor.dataset.calendarMonth ?? '', offset: anchor.offsetTop - scrollArea.scrollTop };
    }
    setFirstMonth((month) => shiftCalendarMonth(month, -1));
  }

  return <div className="home-page__history-mobile">
    <div aria-label={messages.home.calendarTitle} className="home-page__mobile-calendar-scroll" onScroll={(event) => {
      const { scrollTop } = event.currentTarget;
      if (scrollTop <= 8) moveVisibleMonths();
    }} ref={setScrollArea} role="region" tabIndex={0}>
      <div aria-label={messages.home.loadMore} className="home-page__history-sentinel" ref={sentinelRef} />
      {months.map((month) => {
        const title = `${month.year}年${month.month}月`;
        const calendar = buildCalendarMonth(month);
        const isCurrentMonth = month.year === currentMonth.year && month.month === currentMonth.month;
        return <div className="home-page__mobile-calendar-month" data-calendar-month={`${month.year}-${month.month}`} key={`${month.year}-${month.month}`} ref={isCurrentMonth ? currentMonthRef : undefined}>
          <h3>{title}</h3>
          <div aria-label={`${messages.home.calendarTitle} ${title}`} className="home-page__calendar" role="grid">
            <div className="home-page__calendar-weekdays" role="row">{calendar.weekdays.map((weekday) => <span key={weekday} role="columnheader">{weekday}</span>)}</div>
            <CalendarDays dated={dated} days={calendar.days} onSelect={onSelect} today={today} />
          </div>
        </div>;
      })}
    </div>
    {undated.length > 0 && <div className="home-page__undated"><h3>{messages.home.executionHistoryUndatedTitle}</h3><p className="home-page__calendar-note">{messages.home.executionHistoryUndated}</p><ExecutionHistoryList histories={undated} onSelect={onSelect} /></div>}
  </div>;
}

function isBeforeOldestLoadedMonth(month: { month: number; year: number }, histories: AccountExecutionSummary[]) {
  const dated = histories.flatMap((history) => history.postedAt === null ? [] : [new Date(history.postedAt)]);
  if (dated.length === 0) return true;
  const oldest = dated.reduce((current, date) => date < current ? date : current);
  return month.year < oldest.getFullYear() || (month.year === oldest.getFullYear() && month.month < oldest.getMonth() + 1);
}

type CalendarDay = Exclude<ReturnType<typeof buildCalendarMonth>['days'][number], null>;

function CalendarDays({ dated, days, onSelect, today }: { dated: Map<string, AccountExecutionSummary[]>; days: Array<CalendarDay | null>; onSelect: (history: AccountExecutionSummary) => void; today: Date }) {
  const weekCount = Math.ceil(days.length / 7);

  return <div className="home-page__calendar-days">{Array.from({ length: weekCount }, (_, weekIndex) => <div className="home-page__calendar-week" key={weekIndex} role="row">{Array.from({ length: 7 }, (_, dayIndex) => {
    const day = days[weekIndex * 7 + dayIndex] ?? null;
    const isToday = day !== null && isCalendarDayToday(day, today);
    const isFuture = day !== null && isCalendarDayFuture(day, today);
    return <div aria-current={isToday ? 'date' : undefined} className={`home-page__calendar-day${isToday ? ' home-page__calendar-day--today' : ''}${isFuture ? ' home-page__calendar-day--future' : ''}`} key={day?.key ?? `empty-${weekIndex}-${dayIndex}`} role="gridcell">{day !== null && <><span>{day.day}</span>{(dated.get(day.key) ?? []).map((history) => <button aria-label={`${history.routineTitle} ${day.year}年${day.month}月${day.day}日`} className="home-page__calendar-history" key={history.id} onClick={() => onSelect(history)} type="button">{history.routineTitle}</button>)}</>}</div>;
  })}</div>)}</div>;
}

function useCurrentLocalDate() {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timeout = window.setTimeout(() => setToday(new Date()), nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(timeout);
  }, [today]);

  return today;
}

function ExecutionHistoryList({ histories, onSelect, sentinelRef }: { histories: AccountExecutionSummary[]; onSelect: (history: AccountExecutionSummary) => void; sentinelRef?: (element: Element | null) => void | (() => void) }) {
  return <div className="home-page__calendar-list" role="list">{histories.map((history) => <div className="home-page__calendar-event" key={history.id} role="listitem"><ExecutionHistoryCard dateLabel={history.postedAt === null ? messages.home.executionDateUnknown : new Date(history.postedAt).toLocaleDateString('ja-JP')} execution={history} onSelect={onSelect} /></div>)}{sentinelRef !== undefined && <div aria-label={messages.home.loadMore} ref={sentinelRef} />}</div>;
}

function useDesktopLayout() {
  return useSyncExternalStore((listener) => {
    const query = globalThis.matchMedia?.('(min-width: 600px)');
    query?.addEventListener('change', listener);
    return () => query?.removeEventListener('change', listener);
  }, () => globalThis.matchMedia?.('(min-width: 600px)').matches ?? true, () => true);
}

function StateError({ message, retry }: { message: string; retry: () => void }) {
  return <p className="home-page__state home-page__state--error">{message} <button onClick={retry} type="button">{messages.home.retry}</button></p>;
}
