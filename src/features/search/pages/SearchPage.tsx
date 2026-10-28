import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountAvatar } from '../../../shared/components/AccountImage';
import { AppBrandHeader } from '../../../shared/components/AppBrandHeader';
import { ExecutionHistoryCard } from '../../../shared/components/ExecutionHistoryCard';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import messages from '../../../shared/message/message.json';
import { AccountUnauthorizedError, accountService } from '../../account/services/accountService';
import { clearAuthenticated, isAuthenticated as hasAuthenticatedSession } from '../../auth/services/authSession';
import { ReportDialog } from '../../report/components/ReportDialog';
import { RoutineCard, type RoutineCardDisplay } from '../../routineFeed/components/RoutineCard';
import type { Routine } from '../../routineFeed/domain/routine';
import { RoutineLikeUnauthorizedError, routineLikeService, type RoutineLikeService } from '../../routineFeed/services/routineLikeService';
import '../../routineFeed/routineFeed.css';
import '../../routineFeed/routineFeedTypography.css';
import { searchService, type AccountSearchResult, type PopularSearchTag, type RoutineSearchResult, type SearchResult, type SearchService, type SearchTab, type SearchTag } from '../services/searchService';
import '../search.css';

type SearchPageProps = { isAuthenticated?: boolean; likeService?: RoutineLikeService; service?: SearchService };

const tabs: Array<{ label: string; value: SearchTab }> = [
  { label: messages.search.tabs.routines, value: 'routines' },
  { label: messages.navigation.account, value: 'accounts' },
];

export function SearchPage({ isAuthenticated, likeService = routineLikeService, service = searchService }: SearchPageProps) {
  const authenticated = isAuthenticated ?? hasAuthenticatedSession();
  const [activeTab, setActiveTab] = useState<SearchTab>('routines');
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedTags, setSelectedTags] = useState<SearchTag[]>([]);
  const [pickupTags, setPickupTags] = useState<SearchTag[]>([]);
  const [allTags, setAllTags] = useState<SearchTag[] | null>(null);
  const [popularTags, setPopularTags] = useState<PopularSearchTag[]>([]);
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [isAllTagsLoading, setIsAllTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState(false);
  const [allTagsError, setAllTagsError] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagsReloadVersion, setTagsReloadVersion] = useState(0);
  const [allTagsReloadVersion, setAllTagsReloadVersion] = useState(0);
  const [isInputPending, setIsInputPending] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagIdentifiers = useMemo(() => selectedTags.map((tag) => tag.identifier), [selectedTags]);
  const displayedTags = showAllTags && allTags !== null ? allTags : pickupTags;
  const visibleTags = useMemo(() => [...displayedTags, ...selectedTags.filter((selectedTag) => !displayedTags.some((tag) => tag.identifier === selectedTag.identifier))], [displayedTags, selectedTags]);
  const normalizedQuery = submittedQuery?.trim() ?? '';
  const resultsKey = `${activeTab}:${normalizedQuery}:${tagIdentifiers.join(':')}:${searchVersion}`;

  useEffect(() => {
    if (typeof service.listTags !== 'function') return;
    let active = true;
    service.listTags().then((loadedTags) => {
      if (!active) return;
      setPickupTags(loadedTags);
      setTagsError(false);
      setIsTagsLoading(false);
    }).catch(() => {
      if (!active) return;
      setTagsError(true);
      setIsTagsLoading(false);
    });
    return () => { active = false; };
  }, [service, tagsReloadVersion]);

  useEffect(() => {
    if (!showAllTags || allTags !== null) return;
    let active = true;
    service.listAllTags().then((loadedTags) => {
      if (!active) return;
      setAllTags(loadedTags);
      setAllTagsError(false);
      setIsAllTagsLoading(false);
    }).catch(() => {
      if (!active) return;
      setAllTagsError(true);
      setIsAllTagsLoading(false);
    });
    return () => { active = false; };
  }, [allTags, allTagsReloadVersion, service, showAllTags]);

  useEffect(() => {
    if (typeof service.listPopularTags !== 'function') return;
    let active = true;
    service.listPopularTags().then((loadedTags) => {
      if (active) setPopularTags(loadedTags);
    }).catch(() => {});
    return () => { active = false; };
  }, [service]);

  useEffect(() => {
    const query = input.trim();
    if (query.length === 0) return;
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      setSubmittedQuery(query);
      setIsInputPending(false);
      setSearchVersion((version) => version + 1);
    }, 300);
    return () => {
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    };
  }, [input]);

  function changeInput(value: string) {
    const query = value.trim();
    setInput(value);
    if (query.length === 0 && selectedTags.length > 0) {
      setSubmittedQuery('');
      setIsInputPending(false);
      setSearchVersion((version) => version + 1);
      return;
    }
    setIsInputPending(true);
    setSubmittedQuery(null);
  }

  function changeTab(tab: SearchTab) {
    const query = input.trim();
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    setIsInputPending(false);
    setActiveTab(tab);
    if (query.length === 0 && selectedTags.length === 0) {
      setSubmittedQuery(null);
      return;
    }
    setSubmittedQuery(query);
    setSearchVersion((version) => version + 1);
  }

  function toggleTag(tag: SearchTag) {
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    setIsInputPending(false);
    const nextTags = selectedTags.some((selected) => selected.identifier === tag.identifier) ? selectedTags.filter((selected) => selected.identifier !== tag.identifier) : [...selectedTags, tag];
    setSelectedTags(nextTags);
    setSubmittedQuery(input.trim());
    setSearchVersion((version) => version + 1);
  }

  return (
    <Box component="section" className="search-page">
      <Box className="search-page__header">
        <AppBrandHeader />
        <Tabs aria-label={messages.search.tabsAriaLabel} onChange={(_, value: SearchTab) => changeTab(value)} value={activeTab}>
          {tabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
        </Tabs>
        <Box className="search-page__form">
          <TextField
            fullWidth
            label={activeTab === 'routines' ? messages.search.routinesInputLabel : messages.search.accountsInputLabel}
            onChange={(event) => changeInput(event.target.value)}
            placeholder={activeTab === 'routines' ? messages.search.routinesInputPlaceholder : messages.search.accountsInputPlaceholder}
            value={input}
          />
        </Box>
        <Box aria-busy={isTagsLoading || isAllTagsLoading} aria-label={messages.search.tagsLabel}>{isTagsLoading ? null : tagsError ? <Alert action={<Button onClick={() => setTagsReloadVersion((version) => version + 1)}>{messages.search.retry}</Button>} severity="error">{messages.search.tagsError}</Alert> : <><Stack className={showAllTags ? 'search-page__tags search-page__tags--expanded' : 'search-page__tags'} direction="row">{visibleTags.map((tag) => <Button aria-pressed={selectedTags.some((selected) => selected.identifier === tag.identifier)} key={tag.identifier} onClick={() => toggleTag(tag)} size="small" variant={selectedTags.some((selected) => selected.identifier === tag.identifier) ? 'contained' : 'outlined'}>{tag.label}</Button>)}</Stack>{showAllTags ? <><Button className="search-page__close-tags" onClick={() => setShowAllTags(false)} size="small">{messages.search.closeAllTags}</Button>{allTagsError && <Alert action={<Button onClick={() => { setAllTagsError(false); setIsAllTagsLoading(true); setAllTagsReloadVersion((version) => version + 1); }}>{messages.search.retry}</Button>} severity="error">{messages.search.tagsError}</Alert>}</> : <Button onClick={() => { setIsAllTagsLoading(true); setShowAllTags(true); }} size="small">{messages.search.showAllTags}</Button>}</>}</Box>
      </Box>

      <Box className="search-page__main-column">
        {!isInputPending && normalizedQuery.length === 0 && selectedTags.length === 0 && popularTags.length > 0 && <Box className="search-page__popular">
          <Typography component="h2">{messages.search.popularTagsTitle}</Typography>
          <Stack>{popularTags.map((tag, index) => <Button aria-label={`${messages.search.popularTagLabel.replace('{tag}', tag.label)} ${messages.search.popularTagRoutineCount.replace('{count}', String(tag.routineCount))}`} className="search-page__popular-tag" key={tag.identifier} onClick={() => toggleTag(tag)}><Typography aria-hidden="true" component="span" className="search-page__popular-rank">{index + 1}</Typography><Typography component="span">{messages.search.popularTagLabel.replace('{tag}', tag.label)}</Typography><Typography component="span" className="search-page__popular-count">{messages.search.popularTagRoutineCount.replace('{count}', String(tag.routineCount))}</Typography></Button>)}</Stack>
        </Box>}

        <Box className="search-page__content">
          {!isInputPending && (normalizedQuery.length > 0 || selectedTags.length > 0) && <SearchResults activeTab={activeTab} authenticated={authenticated} key={resultsKey} likeService={likeService} query={normalizedQuery} service={service} tagIdentifiers={tagIdentifiers} />}
        </Box>
      </Box>
    </Box>
  );
}

function SearchResults({ activeTab, authenticated, likeService, query, service, tagIdentifiers }: { activeTab: SearchTab; authenticated: boolean; likeService: RoutineLikeService; query: string; service: SearchService; tagIdentifiers: string[] }) {
  return activeTab === 'routines'
    ? <RoutineSearchResults authenticated={authenticated} likeService={likeService} query={query} service={service} tagIdentifiers={tagIdentifiers} />
    : <AccountSearchResults query={query} service={service} tagIdentifiers={tagIdentifiers} />;
}

function AccountSearchResults({ query, service, tagIdentifiers }: { query: string; service: SearchService; tagIdentifiers: string[] }) {
  const fetchPage = useCallback((page: number) => tagIdentifiers.length > 0 ? service.searchPage('accounts', query, page, tagIdentifiers) : service.searchPage('accounts', query, page), [query, service, tagIdentifiers]);
  const list = useInfiniteList<SearchResult>({ fetchPage, key: `accounts:${query}` });
  const hasMore = list.total !== null && list.items.length < list.total;

  if (list.isInitialLoading) return <Loading />;
  if (list.error) return <Alert action={<Button color="inherit" onClick={list.retry}>{messages.search.retry}</Button>} icon={<ErrorOutlineOutlinedIcon />} severity="error">{messages.search.error}</Alert>;
  if (list.items.length === 0) return <Empty tab="accounts" />;

  return (
    <Stack className="search-page__results">
      {list.items.filter((item): item is AccountSearchResult => !isRoutineResult(item)).map((item) => <AccountResultCard item={item} key={item.accountId} />)}
      {hasMore && <Button disabled={list.isLoadingMore} onClick={list.loadNextPage} variant="outlined">{messages.search.loadMore}</Button>}
      {list.isLoadingMore && <Typography className="search-page__load-more-loading">{messages.search.loadMoreLoading}</Typography>}
    </Stack>
  );
}

function RoutineSearchResults({ authenticated, likeService, query, service, tagIdentifiers }: { authenticated: boolean; likeService: RoutineLikeService; query: string; service: SearchService; tagIdentifiers: string[] }) {
  const navigate = useNavigate();
  const [likingPostIdentifiers, setLikingPostIdentifiers] = useState<ReadonlySet<string>>(() => new Set());
  const [likeAnimations, setLikeAnimations] = useState<ReadonlyMap<string, 'like' | 'unlike'>>(() => new Map());
  const [likeError, setLikeError] = useState(false);
  const [reportingRoutine, setReportingRoutine] = useState<Routine | null>(null);
  const [currentAccountIdentifier, setCurrentAccountIdentifier] = useState<string | null | undefined>(authenticated ? undefined : null);
  const fetchPage = useCallback(async (page: number) => {
    const response = tagIdentifiers.length > 0 ? await service.searchPage('routines', query, page, tagIdentifiers) : await service.searchPage('routines', query, page);
    return { items: response.items.filter(isRoutineResult), total: response.total };
  }, [query, service, tagIdentifiers]);
  const list = useInfiniteList<RoutineSearchResult>({ fetchPage, key: `routines:${query}` });
  const hasMore = list.total !== null && list.items.length < list.total;

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    accountService.getProfile().then((profile) => {
      if (!cancelled) setCurrentAccountIdentifier(profile?.accountIdentifier ?? null);
    }).catch((error: unknown) => {
      if (!cancelled && error instanceof AccountUnauthorizedError) setCurrentAccountIdentifier(null);
    });
    return () => { cancelled = true; };
  }, [authenticated]);

  async function toggleLike(postIdentifier: string) {
    const item = list.items.find((result) => result.itemType === 'routine' && result.postId === postIdentifier);
    if (item === undefined || !isRoutinePost(item)) return;
    const routine = toRoutine(item);
    const type = routine.liked ? 'unlike' : 'like';
    setLikingPostIdentifiers((current) => new Set(current).add(postIdentifier));
    setLikeError(false);
    setLikeAnimations((current) => new Map(current).set(postIdentifier, type));
    const toggled: RoutineSearchResult = { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) };
    list.setItems((current) => current.map((result) => result.itemType === 'routine' && result.postId === postIdentifier ? toggled : result));
    try {
      if (routine.liked) await likeService.remove(postIdentifier);
      else await likeService.create(postIdentifier);
    } catch (error) {
      list.setItems((current) => current.map((result) => result.itemType === 'routine' && result.postId === postIdentifier ? item : result));
      if (error instanceof RoutineLikeUnauthorizedError) {
        clearAuthenticated();
        navigate('/login');
      } else setLikeError(true);
    } finally {
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

  if (list.isInitialLoading) return <Loading />;
  if (list.error) return <Alert action={<Button color="inherit" onClick={list.retry}>{messages.search.retry}</Button>} icon={<ErrorOutlineOutlinedIcon />} severity="error">{messages.search.error}</Alert>;
  if (list.items.length === 0) return <Empty tab="routines" />;

  return <Stack className="search-page__results routine-feed-card-scope">
    {likeError && <Alert severity="error">{messages.routineFeed.likeError}</Alert>}
    {list.items.map((item) => {
      if (item.itemType === 'routine_execution') return <div className="routine-feed-execution-post" key={item.postId}><ExecutionHistoryCard author={{ iconImageUrl: item.iconImageUrl, name: item.accountName }} execution={{ executedActionCount: item.executedActionCount, id: item.routineExecutionId, memo: item.executionMemo, postedAt: item.postedAt, routineId: item.routineId, routineTitle: item.routineName, supportCount: item.supportCount }} onSelect={(execution) => navigate(`/routines/${execution.routineId}/executions/${execution.id}`)} /></div>;
      if (!isRoutinePost(item)) return <RoutineCard key={`routine:${item.routineId}:${item.publishedAt}`} routine={toRoutineCard(item)} />;
      const routine = toRoutine(item);
      return <RoutineCard isLiking={likingPostIdentifiers.has(routine.id)} key={routine.id} likeAnimation={likeAnimations.get(routine.id) ?? null} onLike={toggleLike} onReport={!authenticated || currentAccountIdentifier === null || (currentAccountIdentifier !== undefined && currentAccountIdentifier !== routine.accountId) ? setReportingRoutine : undefined} routine={routine} />;
    })}
    {hasMore && <Button disabled={list.isLoadingMore} onClick={list.loadNextPage} variant="outlined">{messages.search.loadMore}</Button>}
    {list.isLoadingMore && <Typography className="search-page__load-more-loading">{messages.search.loadMoreLoading}</Typography>}
    {reportingRoutine !== null && <ReportDialog onClose={() => setReportingRoutine(null)} onUnauthorized={() => { clearAuthenticated(); navigate('/login'); }} open targetAccountIdentifier={reportingRoutine.accountId} targetPostIdentifier={reportingRoutine.id} />}
  </Stack>;
}

function isRoutineResult(item: SearchResult): item is RoutineSearchResult {
  return 'itemType' in item;
}

function isRoutinePost(item: RoutineSearchResult): item is RoutineSearchResult & { itemType: 'routine'; liked: boolean; likes: number; postId: string; postedAt: string } {
  return item.itemType === 'routine' && item.liked !== null && item.likes !== null && item.postId !== null && item.postedAt !== null;
}

function toRoutine(item: RoutineSearchResult & { itemType: 'routine'; liked: boolean; likes: number; postId: string; postedAt: string }): Routine {
  return {
    accountId: item.accountId,
    authorName: item.accountName,
    createdAt: item.postedAt,
    customizations: item.customizations,
    customizationOrigin: item.customizationOrigin,
    durationMinutes: item.routineExecutionMinutes,
    executions: item.executions,
    iconImageUrl: item.iconImageUrl,
    id: item.postId,
    liked: item.liked,
    likes: item.likes,
    postCategory: 'routine',
    routineId: item.routineId,
    steps: item.routineActions,
    tags: item.tags,
    title: item.routineName,
  };
}

function toRoutineCard(item: RoutineSearchResult & { itemType: 'routine' }): RoutineCardDisplay {
  return {
    accountId: item.accountId,
    authorName: item.accountName,
    createdAt: item.postedAt,
    customizations: item.customizations,
    customizationOrigin: item.customizationOrigin,
    durationMinutes: item.routineExecutionMinutes,
    executions: item.executions,
    iconImageUrl: item.iconImageUrl,
    id: item.postId,
    liked: item.liked,
    likes: item.likes,
    postCategory: 'routine',
    routineId: item.routineId,
    steps: item.routineActions,
    tags: item.tags,
    title: item.routineName,
  };
}

function Loading() {
  return <Stack className="search-page__loading"><CircularProgress aria-label={messages.search.loading} /><Typography>{messages.search.loading}</Typography></Stack>;
}

function Empty({ tab }: { tab: SearchTab }) {
  return <Typography className="search-page__empty">{tab === 'routines' ? messages.search.routinesEmpty : messages.search.accountsEmpty}</Typography>;
}

function AccountResultCard({ item }: { item: AccountSearchResult }) {
  return <article className="search-account-card"><AccountAvatar className="search-account-card__avatar" iconImageUrl={item.iconImageUrl} initial={item.accountName.slice(0, 1)} /><span><Link aria-label={item.accountName} className="search-account-card__content" to={`/accounts/${item.accountId}`}><strong>{item.accountName}</strong></Link>{item.bio !== null && <span>{item.bio}</span>}</span></article>;
}
