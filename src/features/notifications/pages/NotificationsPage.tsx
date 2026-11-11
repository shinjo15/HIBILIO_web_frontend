/* eslint-disable react-hooks/refs */
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthenticated, getAuthenticationGeneration, getAuthenticationStatus, subscribeToAuthentication } from '../../auth/services/authSession';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import messages from '../../../shared/message/message.json';
import { notificationService, NotificationUnauthorizedError, type NotificationService, type PersonalNotification } from '../services/notificationService';
import { unreadNotificationCountChangedEvent } from '../services/unreadNotificationCount';
import '../notifications.css';

type NotificationsPageProps = { service?: NotificationService };
type ActiveTab = 'announcements' | 'notifications';
const emptyMarkingIdentifiers: ReadonlySet<string> = new Set();
const emptyExpandedAnnouncementIdentifiers: ReadonlySet<string> = new Set();
const emptyReadErrorIdentifiers: ReadonlySet<string> = new Set();

export function NotificationsPage({ service = notificationService }: NotificationsPageProps) {
  const navigate = useNavigate();
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);
  const authenticationGeneration = useSyncExternalStore(subscribeToAuthentication, getAuthenticationGeneration, getAuthenticationGeneration);
  const [activeTab, setActiveTab] = useState<ActiveTab>('notifications');
  const [markingState, setMarkingState] = useState(() => ({ generation: getAuthenticationGeneration(), identifiers: new Set<string>() }));
  const [expandedAnnouncementState, setExpandedAnnouncementState] = useState(() => ({ generation: getAuthenticationGeneration(), identifiers: new Set<string>() }));
  const [readErrorState, setReadErrorState] = useState(() => ({ generation: getAuthenticationGeneration(), identifiers: new Set<string>() }));
  const tabRefs = useRef<Record<ActiveTab, HTMLButtonElement | null>>({ announcements: null, notifications: null });
  const markingIdentifiersRef = useRef({ generation: getAuthenticationGeneration(), identifiers: new Set<string>() });
  const onUnauthorized = useCallback(() => {
    if (getAuthenticationGeneration() !== authenticationGeneration) return;
    clearAuthenticated();
    navigate('/login');
  }, [authenticationGeneration, navigate]);
  const onListError = useCallback((error: unknown) => { if (error instanceof NotificationUnauthorizedError) onUnauthorized(); }, [onUnauthorized]);
  const enabled = authenticationStatus === 'authenticated';
  const notifications = useInfiniteList({ enabled: enabled && activeTab === 'notifications', fetchPage: service.listNotifications, key: `notifications-${authenticationGeneration}`, onError: onListError });
  const announcements = useInfiniteList({ enabled: enabled && activeTab === 'announcements', fetchPage: service.listAnnouncements, key: `announcements-${authenticationGeneration}`, onError: onListError });
  const list = activeTab === 'notifications' ? notifications : announcements;
  const markingIdentifiers = markingState.generation === authenticationGeneration ? markingState.identifiers : emptyMarkingIdentifiers;
  const expandedAnnouncementIdentifiers = expandedAnnouncementState.generation === authenticationGeneration ? expandedAnnouncementState.identifiers : emptyExpandedAnnouncementIdentifiers;
  const readErrorIdentifiers = readErrorState.generation === authenticationGeneration ? readErrorState.identifiers : emptyReadErrorIdentifiers;

  async function markAsRead(notification: PersonalNotification) {
    if (notification.status === 'read') return;
    const requestGeneration = authenticationGeneration;
    if (markingIdentifiersRef.current.generation !== requestGeneration) markingIdentifiersRef.current = { generation: requestGeneration, identifiers: new Set() };
    if (markingIdentifiersRef.current.identifiers.has(notification.id)) return;
    markingIdentifiersRef.current.identifiers.add(notification.id);
    setMarkingState((current) => ({ generation: requestGeneration, identifiers: new Set(current.generation === requestGeneration ? current.identifiers : []).add(notification.id) }));
    try {
      await service.markAsRead(notification.id);
      if (getAuthenticationGeneration() !== requestGeneration) return;
      notifications.setItems((current) => current.map((item) => item.id === notification.id ? { ...item, status: 'read' } : item));
      window.dispatchEvent(new Event(unreadNotificationCountChangedEvent));
      setReadErrorState((current) => {
        if (current.generation !== requestGeneration || !current.identifiers.has(notification.id)) return current;
        const identifiers = new Set(current.identifiers);
        identifiers.delete(notification.id);
        return { generation: requestGeneration, identifiers };
      });
    } catch (error) {
      if (getAuthenticationGeneration() !== requestGeneration) return;
      if (error instanceof NotificationUnauthorizedError) onUnauthorized();
      else setReadErrorState((current) => ({ generation: requestGeneration, identifiers: new Set(current.generation === requestGeneration ? current.identifiers : []).add(notification.id) }));
    } finally {
      if (getAuthenticationGeneration() === requestGeneration) {
        markingIdentifiersRef.current.identifiers.delete(notification.id);
        setMarkingState((current) => {
          if (current.generation !== requestGeneration) return current;
          const identifiers = new Set(current.identifiers);
          identifiers.delete(notification.id);
          return { generation: requestGeneration, identifiers };
        });
      }
    }
  }


  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    tabRefs.current[tab]?.focus();
  }

  function handleTabKeyDown(tab: ActiveTab, key: string) {
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    selectTab(tab === 'notifications' ? 'announcements' : 'notifications');
  }

  function toggleAnnouncement(announcementIdentifier: string) {
    setExpandedAnnouncementState((current) => {
      const identifiers = current.generation === authenticationGeneration ? new Set(current.identifiers) : new Set<string>();
      if (identifiers.has(announcementIdentifier)) identifiers.delete(announcementIdentifier);
      else identifiers.add(announcementIdentifier);
      return { generation: authenticationGeneration, identifiers };
    });
  }

  return <section className="notifications-page">
    <h1 className="notifications-page__heading">{messages.notifications.title}</h1>
    <main className="notifications-page__content">
      <div aria-label={messages.notifications.tabsAriaLabel} className="notifications-page__tabs" role="tablist">
        {(['notifications', 'announcements'] as const).map((tab) => <button aria-controls={`notifications-${tab}-panel`} aria-selected={activeTab === tab} className={activeTab === tab ? 'notifications-page__tab notifications-page__tab--selected' : 'notifications-page__tab'} id={`notifications-${tab}-tab`} key={tab} onClick={() => selectTab(tab)} onKeyDown={(event) => handleTabKeyDown(tab, event.key)} ref={(element) => { tabRefs.current[tab] = element; }} role="tab" tabIndex={activeTab === tab ? 0 : -1} type="button">{messages.notifications.tabs[tab]}</button>)}
      </div>
      <div aria-labelledby={`notifications-${activeTab}-tab`} id={`notifications-${activeTab}-panel`} role="tabpanel">
      {list.isInitialLoading && <p aria-live="polite" className="notifications-page__state" role="status">{messages.notifications.loading}</p>}
      {list.error && list.items.length === 0 && <div className="notifications-page__state notifications-page__state--error" role="alert"><p>{messages.notifications.error}</p><button className="notifications-page__retry" onClick={list.retry} type="button">{messages.notifications.retry}</button></div>}
      {!list.isInitialLoading && !list.error && list.items.length === 0 && <p className="notifications-page__state">{activeTab === 'notifications' ? messages.notifications.emptyNotifications : messages.notifications.emptyAnnouncements}</p>}
      {activeTab === 'notifications' && notifications.items.length > 0 && <ul className="notifications-page__list">
        {notifications.items.map((notification) => {
          const isUnread = notification.status === 'unread';
          const markNotificationAsRead = () => { void markAsRead(notification); };
          return <li aria-busy={markingIdentifiers.has(notification.id) || undefined} aria-label={notificationAccessibleName(notification)} className={isUnread ? 'notifications-page__item notifications-page__item--unread notifications-page__item--actionable' : 'notifications-page__item'} key={notification.id} onClick={isUnread ? markNotificationAsRead : undefined} onKeyDown={isUnread ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); markNotificationAsRead(); } } : undefined} role={isUnread ? 'button' : undefined} tabIndex={isUnread ? 0 : undefined}><p className="notifications-page__item-content">{notification.content}</p><time className="notifications-page__item-meta" dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>{isUnread && readErrorIdentifiers.has(notification.id) && <div className="notifications-page__action-error" role="alert">{messages.notifications.markReadError}</div>}</li>;
        })}
      </ul>}
      {activeTab === 'announcements' && announcements.items.length > 0 && <ul className="notifications-page__list">
        {announcements.items.map((announcement) => {
          const expanded = expandedAnnouncementIdentifiers.has(announcement.id);
          return <li className="notifications-page__item notifications-page__announcement" key={announcement.id}><button aria-expanded={expanded} aria-label={`${announcement.title} ${expanded ? messages.notifications.closeAnnouncement : messages.notifications.openAnnouncement}`} className="notifications-page__announcement-button" onClick={() => toggleAnnouncement(announcement.id)} type="button"><span className="notifications-page__item-title">{announcement.title}</span><span className="notifications-page__item-content">{expanded ? announcement.content : previewAnnouncementContent(announcement.content)}</span><time className="notifications-page__item-meta" dateTime={announcement.createdAt}>{formatDate(announcement.createdAt)}</time></button></li>;
        })}
      </ul>}
      {list.error && list.items.length > 0 && <div className="notifications-page__state notifications-page__state--error" role="alert"><p>{messages.notifications.error}</p><button className="notifications-page__retry" onClick={list.retry} type="button">{messages.notifications.retry}</button></div>}
      {list.items.length > 0 && list.total !== null && list.items.length < list.total && <><button className="notifications-page__load-more" disabled={list.isLoadingMore} onClick={list.loadNextPage} type="button">{list.isLoadingMore ? messages.notifications.loadingMore : messages.notifications.loadMore}</button><div aria-hidden="true" className="notifications-page__sentinel" ref={list.sentinelRef} /></>}
      </div>
    </main>
  </section>;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

function notificationAccessibleName(notification: PersonalNotification): string {
  const status = notification.status === 'unread' ? `${messages.notifications.unread} ${messages.notifications.markRead}` : messages.notifications.read;
  return `${notification.content} ${status} ${formatDate(notification.createdAt)}`;
}

function previewAnnouncementContent(content: string): string {
  const graphemes = typeof Intl.Segmenter === 'undefined' ? Array.from(content) : Array.from(new Intl.Segmenter('ja-JP', { granularity: 'grapheme' }).segment(content), ({ segment }) => segment);
  return graphemes.length > 50 ? `${graphemes.slice(0, 50).join('')}…` : content;
}
