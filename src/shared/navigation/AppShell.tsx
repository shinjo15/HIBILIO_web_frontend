import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AddIcon from '@mui/icons-material/Add';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SendIcon from '@mui/icons-material/Send';
import {
  Badge,
  Box,
  ButtonBase,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthenticated, getAuthenticationGeneration, getAuthenticationStatus, restoreAuthentication, subscribeToAuthentication } from '../../features/auth/services/authSession';
import { getUnreadNotificationCount, NotificationCountUnauthorizedError, unreadNotificationCountChangedEvent } from '../../features/notifications/services/unreadNotificationCount';
import { HibilioMark } from '../brand/HibilioMark';
import messages from '../message/message.json';
import './appShell.css';

const desktopNavigationWidth = 224;

type NavigationItem = {
  icon: ReactNode;
  label: string;
  path: string;
};

const navigationItems: NavigationItem[] = [
  { icon: <HomeOutlinedIcon fontSize="small" />, label: messages.navigation.home, path: '/home' },
  { icon: <ViewAgendaOutlinedIcon fontSize="small" />, label: messages.navigation.feed, path: '/feed' },
  { icon: <SearchOutlinedIcon fontSize="small" />, label: messages.navigation.search, path: '/search' },
  { icon: <AccountCircleOutlinedIcon fontSize="small" />, label: messages.navigation.account, path: '/account' },
];

function selectedPath(pathname: string): string {
  if (pathname === '/home') return '/home';
  if (pathname === '/' || pathname === '/feed') return '/feed';
  if (pathname === '/account' || pathname === '/account/settings') {
    return '/account';
  }

  if (pathname === '/routines/new') {
    return '/routines/new';
  }

  if (pathname === '/search') {
    return '/search';
  }

  return '/feed';
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = selectedPath(location.pathname);
  const isRoutineCreate = location.pathname === '/routines/new'
    || /^\/routines\/[^/]+\/customize$/.test(location.pathname);
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);
  const authenticationGeneration = useSyncExternalStore(subscribeToAuthentication, getAuthenticationGeneration, getAuthenticationGeneration);
  const [canSubmitRoutineCreate, setCanSubmitRoutineCreate] = useState(false);
  const unreadNotificationCount = useUnreadNotificationCount({
    authenticationGeneration,
    enabled: authenticationStatus === 'authenticated' && location.pathname === '/home',
    visitKey: location.key,
  });
  const routineCreateGuideId = useId();

  useEffect(() => {
    if (authenticationStatus === 'loading') void restoreAuthentication();
  }, [authenticationStatus]);

  useEffect(() => {
    function updateRoutineCreateSubmissionState(event: Event) {
      setCanSubmitRoutineCreate((event as CustomEvent<{ canSubmit: boolean }>).detail.canSubmit);
    }

    window.addEventListener('routine-create-submission-state', updateRoutineCreateSubmissionState);
    return () => window.removeEventListener('routine-create-submission-state', updateRoutineCreateSubmissionState);
  }, []);

  function protectedPath(path: string): string {
    return authenticationStatus !== 'unauthenticated' || path === '/feed' || path === '/home' || path === '/search' ? path : '/login';
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Drawer
        sx={{
          display: { lg: 'block', xs: 'none' },
          width: desktopNavigationWidth,
          '& .MuiDrawer-paper': {
            backgroundColor: 'background.paper',
            borderRightColor: 'divider',
            boxSizing: 'border-box',
            width: desktopNavigationWidth,
          },
        }}
        variant="permanent"
      >
        <Box className="hibilio-desktop-nav" component="nav" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2.5, py: 3 }}>
            <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
              <HibilioMark />
              <Typography component="p" sx={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, letterSpacing: '0.04em' }}>
                {messages.app.name}
              </Typography>
            </Box>
            <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
              {messages.app.tagline}
            </Typography>
          </Box>

          <List aria-label={messages.navigation.ariaLabel} sx={{ p: 1.5 }}>
            {navigationItems.map((item) => (
              <ListItemButton
                component={RouterLink}
                key={item.path}
                selected={activePath === item.path}
                sx={{
                  borderRadius: 2 / 3,
                  color: 'text.secondary',
                  gap: 1,
                  mb: 0.5,
                  px: 1.25,
                  py: 1,
                  '&.Mui-selected': { backgroundColor: 'var(--hibilio-color-muted)', color: 'primary.main' },
                  '&.Mui-selected:hover': { backgroundColor: 'var(--hibilio-color-muted)' },
                  '&:hover': { backgroundColor: 'var(--hibilio-color-muted)', color: 'text.primary' },
                }}
                to={protectedPath(item.path)}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 28 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 500 } } }} />
              </ListItemButton>
            ))}
          </List>

          <List sx={{ mt: 'auto', p: 1.5 }}>
            <ListItemButton
              className="hibilio-desktop-nav__create-trigger"
              component={RouterLink}
              selected={activePath === '/routines/new'}
              sx={{
                backgroundColor: 'primary.main',
                borderRadius: 2 / 3,
                color: 'primary.contrastText',
                gap: 1,
                px: 1.25,
                py: 1,
                '&.Mui-selected': { backgroundColor: 'primary.main' },
                '&:hover': { backgroundColor: 'primary.main', opacity: 0.9 },
              }}
              to={protectedPath('/routines/new')}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 28 }}><AddIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={messages.navigation.createRoutine} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 500 } } }} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pb: { lg: 0, xs: 8 } }}>
        <Outlet />
      </Box>

      <Box aria-label={messages.navigation.ariaLabel} className="hibilio-mobile-nav" component="nav">
        {navigationItems.slice(0, 2).map((item) => {
          const isSelected = activePath === item.path;
          return (
            <ButtonBase
              aria-current={isSelected ? 'page' : undefined}
              aria-label={item.label}
              key={item.path}
              onClick={() => navigate(protectedPath(item.path))}
              sx={{
                color: isSelected ? 'primary.main' : 'text.secondary',
                display: 'flex', flexDirection: 'column', fontSize: 10, fontWeight: 500,
                gap: 0.25, height: '100%', justifyContent: 'center', minWidth: 0, width: '100%',
              }}
            >
              {item.icon}
              {item.label}
            </ButtonBase>
          );
        })}
        <RoutineCreateMobileTrigger
          activePath={activePath}
          canSubmit={canSubmitRoutineCreate}
          id={routineCreateGuideId}
          isRoutineCreate={isRoutineCreate}
          key={isRoutineCreate ? 'routine-create' : 'navigation'}
          onNavigateToCreate={() => navigate(protectedPath('/routines/new'))}
        />
        {navigationItems.slice(2).map((item) => {
          const isSelected = activePath === item.path;
          return (
            <ButtonBase
              aria-current={isSelected ? 'page' : undefined}
              aria-label={item.label}
              key={item.path}
              onClick={() => navigate(protectedPath(item.path))}
              sx={{
                color: isSelected ? 'primary.main' : 'text.secondary',
                display: 'flex', flexDirection: 'column', fontSize: 10, fontWeight: 500,
                gap: 0.25, height: '100%', justifyContent: 'center', minWidth: 0, width: '100%',
              }}
            >
              {item.icon}
              {item.label}
            </ButtonBase>
          );
        })}
      </Box>
      {authenticationStatus === 'authenticated' && location.pathname === '/home' && <IconButton aria-label={notificationBellAccessibleName(unreadNotificationCount)} className="hibilio-notifications" color={unreadNotificationCount.status === 'known' && unreadNotificationCount.count > 0 ? 'primary' : 'inherit'} onClick={() => navigate('/notifications')} sx={unreadNotificationCount.status === 'known' && unreadNotificationCount.count > 0 ? undefined : { color: 'text.secondary' }}><Badge badgeContent={unreadNotificationCount.status === 'known' ? unreadNotificationCount.count : 0} color="primary" invisible={unreadNotificationCount.status !== 'known' || unreadNotificationCount.count === 0} max={Number.MAX_SAFE_INTEGER}><NotificationsNoneOutlinedIcon /></Badge></IconButton>}
    </Box>
  );
}

type UnreadNotificationCountState =
  | { count: number; generation: number; status: 'known'; visitKey: string }
  | { generation: number; status: 'error' | 'loading'; visitKey: string };

function notificationBellAccessibleName(countState: UnreadNotificationCountState): string {
  if (countState.status === 'loading') return messages.navigation.notificationsCountLoading;
  if (countState.status === 'error') return messages.navigation.notificationsCountError;
  if (countState.status === 'known' && countState.count > 0) return messages.navigation.notificationsUnread.replace('{count}', String(countState.count));
  return messages.navigation.notificationsNoUnread;
}

function useUnreadNotificationCount({
  authenticationGeneration,
  enabled,
  visitKey,
}: {
  authenticationGeneration: number;
  enabled: boolean;
  visitKey: string;
}): UnreadNotificationCountState {
  const [countState, setCountState] = useState<UnreadNotificationCountState>({ generation: -1, status: 'loading', visitKey: '' });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestRef = useRef({ generation: -1, identifier: 0, inFlight: false, refreshPending: false });

  const refresh = useCallback((afterRead = false) => {
    if (!enabled) return;
    const current = requestRef.current;
    if (current.generation === authenticationGeneration && current.inFlight) {
      if (afterRead) requestRef.current = { ...current, refreshPending: true };
      return;
    }
    const identifier = current.identifier + 1;
    requestRef.current = { generation: authenticationGeneration, identifier, inFlight: true, refreshPending: false };
    void getUnreadNotificationCount().then((unreadCount) => {
      const completed = requestRef.current;
      if (completed.generation !== authenticationGeneration || completed.identifier !== identifier || getAuthenticationGeneration() !== authenticationGeneration) return;
      if (completed.refreshPending) {
        requestRef.current = { ...completed, inFlight: false, refreshPending: false };
        setRefreshVersion((version) => version + 1);
        return;
      }
      requestRef.current = { ...completed, inFlight: false };
      setCountState({ count: unreadCount, generation: authenticationGeneration, status: 'known', visitKey });
    }).catch((error: unknown) => {
      const completed = requestRef.current;
      if (completed.generation !== authenticationGeneration || completed.identifier !== identifier || getAuthenticationGeneration() !== authenticationGeneration) return;
      if (completed.refreshPending) {
        requestRef.current = { ...completed, inFlight: false, refreshPending: false };
        setRefreshVersion((version) => version + 1);
        return;
      }
      requestRef.current = { ...completed, inFlight: false };
      setCountState({ generation: authenticationGeneration, status: 'error', visitKey });
      if (error instanceof NotificationCountUnauthorizedError) clearAuthenticated();
    });
  }, [authenticationGeneration, enabled, visitKey]);

  useEffect(() => {
    if (!enabled) {
      requestRef.current = { ...requestRef.current, identifier: requestRef.current.identifier + 1, inFlight: false, refreshPending: false };
      return;
    }

    refresh();
    const refreshOnFocus = () => refresh();
    window.addEventListener('focus', refreshOnFocus);
    const refreshAfterRead = () => refresh(true);
    window.addEventListener(unreadNotificationCountChangedEvent, refreshAfterRead);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener(unreadNotificationCountChangedEvent, refreshAfterRead);
      requestRef.current = { ...requestRef.current, identifier: requestRef.current.identifier + 1, inFlight: false, refreshPending: false };
    };
  }, [enabled, refresh, refreshVersion]);

  return enabled && countState.generation === authenticationGeneration && countState.visitKey === visitKey
    ? countState
    : { generation: authenticationGeneration, status: 'loading', visitKey };
}

function RoutineCreateMobileTrigger({
  activePath,
  canSubmit,
  id,
  isRoutineCreate,
  onNavigateToCreate,
}: {
  activePath: string;
  canSubmit: boolean;
  id: string;
  isRoutineCreate: boolean;
  onNavigateToCreate: () => void;
}) {
  const [guideState, setGuideState] = useState<'visible' | 'fading' | 'hidden'>('visible');
  const className = isRoutineCreate
    ? `hibilio-mobile-nav__create-trigger hibilio-mobile-nav__create-trigger--attention${canSubmit ? '' : ' hibilio-mobile-nav__create-trigger--disabled'}`
    : 'hibilio-mobile-nav__create-trigger';

  useEffect(() => {
    if (!isRoutineCreate) return;

    const fadeTimeoutId = window.setTimeout(() => setGuideState('fading'), 5_000);
    const removeTimeoutId = window.setTimeout(() => setGuideState('hidden'), 5_300);
    return () => {
      window.clearTimeout(fadeTimeoutId);
      window.clearTimeout(removeTimeoutId);
    };
  }, [isRoutineCreate]);

  return (
    <>
      <ButtonBase
        aria-current={activePath === '/routines/new' ? 'page' : undefined}
        aria-describedby={isRoutineCreate && guideState !== 'hidden' ? id : undefined}
        aria-label={isRoutineCreate ? messages.routineCreate.submit : messages.navigation.createRoutine}
        className={className}
        disabled={isRoutineCreate && !canSubmit}
        form={isRoutineCreate ? 'routine-create-form' : undefined}
        onClick={isRoutineCreate ? undefined : onNavigateToCreate}
        type={isRoutineCreate ? 'submit' : 'button'}
        sx={{ alignItems: 'center', display: 'flex', height: '100%', justifyContent: 'center', minWidth: 0, width: '100%' }}
      >
        <Box
          className="hibilio-mobile-nav__create-icon hibilio-mobile-nav__create-icon--enlarged"
          sx={{
            alignItems: 'center', backgroundColor: 'primary.main', borderRadius: '50%',
            color: 'primary.contrastText', display: 'flex', height: 48, justifyContent: 'center', marginTop: -2.5, width: 48,
          }}
        >
          {isRoutineCreate ? <SendIcon fontSize="small" /> : <AddIcon />}
        </Box>
        {isRoutineCreate && guideState !== 'hidden' && (
          <Box
            aria-live="polite"
            className={`hibilio-mobile-nav__create-guide${guideState === 'fading' ? ' hibilio-mobile-nav__create-guide--fading' : ''}`}
            component="span"
            id={id}
            role="tooltip"
            sx={{ pointerEvents: 'none' }}
          >
            <span>{messages.routineCreate.submitGuide}</span>
            {!canSubmit && <small>{messages.routineCreate.submitDisabledGuide}</small>}
          </Box>
        )}
      </ButtonBase>
    </>
  );
}
