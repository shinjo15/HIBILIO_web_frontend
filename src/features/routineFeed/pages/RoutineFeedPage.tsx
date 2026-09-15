/* eslint-disable react-hooks/refs */
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Alert, Box, Button, CircularProgress, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutineCard } from '../components/RoutineCard';
import type { FollowingAccount, Routine, RoutineFeedTab } from '../domain/routine';
import { routineFeedService, RoutineFeedUnauthorizedError, type RoutineFeedService } from '../services/routineFeedService';
import { routineLikeService, RoutineLikeUnauthorizedError, type RoutineLikeService } from '../services/routineLikeService';
import { clearAuthenticated, isAuthenticated as hasAuthenticatedSession } from '../../auth/services/authSession';
import { AccountRelationList } from '../../../shared/components/AccountRelationList';
import { HibilioMark } from '../../../shared/brand/HibilioMark';
import messages from '../../../shared/message/message.json';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import '../routineFeed.css';
import '../routineFeedTypography.css';

type RoutineFeedPageProps = { isAuthenticated?: boolean; likeService?: RoutineLikeService; service?: RoutineFeedService };
type FeedTab = RoutineFeedTab | 'followingAccounts';

const tabs: Array<{ label: string; value: FeedTab }> = [
  { label: messages.routineFeed.tabs.following, value: 'following' },
  { label: messages.routineFeed.tabs.recommended, value: 'recommended' },
  { label: messages.routineFeed.tabs.popular, value: 'popular' },
  { label: messages.routineFeed.tabs.followingAccounts, value: 'followingAccounts' },
];

export function RoutineFeedPage({ isAuthenticated, likeService = routineLikeService, service = routineFeedService }: RoutineFeedPageProps) {
  const navigate = useNavigate();
  const authenticated = isAuthenticated ?? hasAuthenticatedSession();
  const availableTabs = authenticated ? tabs : tabs.filter((tab) => tab.value === 'popular');
  const [activeTab, setActiveTab] = useState<FeedTab>(authenticated ? 'recommended' : 'popular');
  const [followingAccounts, setFollowingAccounts] = useState<FollowingAccount[]>([]);
  const [hasError, setHasError] = useState(false);
  const [likingPostIdentifier, setLikingPostIdentifier] = useState<string | null>(null);
  const [likeAnimation, setLikeAnimation] = useState<{ postIdentifier: string; type: 'like' | 'unlike' } | null>(null);
  const [likeError, setLikeError] = useState(false);

  const fetchRoutinePage = useCallback(async (page: number) => {
    if (service.listPage !== undefined) return service.listPage(activeTab as RoutineFeedTab, page);
    const items = await service.list(activeTab as RoutineFeedTab);
    return { items, total: items.length };
  }, [activeTab, service]);
  const handleRoutineError = useCallback((error: unknown) => {
    if (error instanceof RoutineFeedUnauthorizedError) {
      clearAuthenticated();
      navigate('/login');
    }
  }, [navigate]);
  const routineList = useInfiniteList({ enabled: activeTab !== 'followingAccounts', fetchPage: fetchRoutinePage, key: activeTab, onError: handleRoutineError });
  const routines = routineList.items;
  const setRoutines = routineList.setItems;

  useEffect(() => {
    let cancelled = false;

    const handleError = (error: unknown) => {
      if (!cancelled) {
        if (error instanceof RoutineFeedUnauthorizedError) {
          clearAuthenticated();
          navigate('/login');
          return;
        }

        setFollowingAccounts([]);
        setHasError(true);
      }
    };

    if (activeTab === 'followingAccounts') {
      service.listFollowingAccounts().then((result) => {
        if (!cancelled) {
          setFollowingAccounts(result);
        }
      }).catch(handleError);
    }

    return () => { cancelled = true; };
  }, [activeTab, navigate, service]);

  function handleTabChange(tab: FeedTab) {
    setHasError(false);
    setActiveTab(tab);
  }

  async function toggleLike(postIdentifier: string) {
    const routine = routines.find((item) => item.id === postIdentifier);
    if (routine === undefined) return;
    const type = routine.liked ? 'unlike' : 'like';
    setLikingPostIdentifier(postIdentifier);
    setLikeError(false);
    setLikeAnimation({ postIdentifier, type });
    const updateRoutine = (item: Routine) => item.id === postIdentifier ? { ...item, liked: !routine.liked, likes: item.likes + (routine.liked ? -1 : 1) } : item;
    setRoutines((current) => current.map(updateRoutine));
    try {
      if (routine?.liked) {
        await likeService.remove(postIdentifier);
      } else {
        await likeService.create(postIdentifier);
      }
    } catch (error) {
      setRoutines((current) => current.map((item) => item.id === postIdentifier ? routine : item));
      if (error instanceof RoutineLikeUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else {
        setLikeError(true);
      }
    } finally {
      setLikingPostIdentifier(null);
      setLikeAnimation(null);
    }
  }


  return (
    <Box component="section" className="routine-feed-page">
      <Box className="routine-feed-header">
          <Stack className="routine-feed-header__top">
            <Stack className="routine-feed-brand">
              <HibilioMark />
              <Typography component="h1" className="routine-feed-brand__name">
                {messages.app.name}
              </Typography>
            </Stack>
            <IconButton
              aria-label={messages.routineFeed.search}
              className="routine-feed-search"
            >
              <SearchOutlinedIcon className="routine-feed-search__icon" />
            </IconButton>
          </Stack>
          <Tabs
            aria-label={messages.routineFeed.tabs.ariaLabel}
            className="routine-feed-tabs"
            onChange={(_, value: FeedTab) => handleTabChange(value)}
            value={activeTab}
          >
            {availableTabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
          </Tabs>
      </Box>

      <Box className="routine-feed-scroll">
        <Box className="routine-feed-content">
        {(activeTab === 'followingAccounts' ? false : routineList.isInitialLoading) && (
          <Stack className="routine-feed-loading">
            <CircularProgress aria-label={messages.routineFeed.loading} className="routine-feed-loading__progress" />
            <Typography className="routine-feed-loading__text">{messages.routineFeed.loading}</Typography>
          </Stack>
        )}

        {((activeTab === 'followingAccounts' && hasError) || (activeTab !== 'followingAccounts' && routineList.error)) && (
          <Alert
            action={<Button className="routine-feed-error__retry" onClick={() => activeTab === 'followingAccounts' ? handleTabChange(activeTab) : routineList.retry()} startIcon={<RefreshOutlinedIcon />}>{messages.routineFeed.retry}</Button>}
            icon={<ErrorOutlineOutlinedIcon />}
            severity="error"
            className="routine-feed-error"
          >
            {activeTab === 'followingAccounts' ? messages.routineFeed.followingAccountsError : messages.routineFeed.error}
          </Alert>
        )}

        {!routineList.isInitialLoading && !routineList.error && activeTab !== 'followingAccounts' && routines.length === 0 && (
          <Stack className="routine-feed-empty">
            <Typography component="h2" className="routine-feed-empty__title">{messages.routineFeed.emptyTitle}</Typography>
            <Typography className="routine-feed-empty__description">{messages.routineFeed.emptyDescription}</Typography>
          </Stack>
        )}

        {!hasError && activeTab === 'followingAccounts' && followingAccounts.length === 0 && (
          <Stack className="routine-feed-empty">
            <Typography component="h2" className="routine-feed-empty__title">{messages.routineFeed.followingAccountsEmptyTitle}</Typography>
            <Typography className="routine-feed-empty__description">{messages.routineFeed.followingAccountsEmptyDescription}</Typography>
          </Stack>
        )}

        {!hasError && activeTab === 'followingAccounts' && followingAccounts.length > 0 && <AccountRelationList accounts={followingAccounts} className="routine-feed-account-list" />}

        {!routineList.isInitialLoading && activeTab !== 'followingAccounts' && routines.length > 0 && (
          <Stack className="routine-feed-list">
            {likeError && <Alert severity="error">{messages.routineFeed.likeError}</Alert>}
            {routines.map((routine) => <RoutineCard isLiking={likingPostIdentifier === routine.id} key={routine.id} likeAnimation={likeAnimation?.postIdentifier === routine.id ? likeAnimation.type : null} onLike={toggleLike} routine={routine} />)}
            <Box aria-label="さらに読み込む" ref={routineList.sentinelRef} />
            <Box className="routine-feed-list__spacer" />
          </Stack>
        )}
        </Box>
      </Box>
    </Box>
  );
}
