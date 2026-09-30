import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AccountAvatar } from '../../../shared/components/AccountImage';
import { AppBrandHeader } from '../../../shared/components/AppBrandHeader';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import messages from '../../../shared/message/message.json';
import { formatPostedAt } from '../../routineFeed/domain/routine';
import { searchService, type AccountSearchResult, type RoutineSearchResult, type SearchResult, type SearchService, type SearchTab, type SearchTag } from '../services/searchService';
import '../search.css';

type SearchPageProps = { service?: SearchService };

const tabs: Array<{ label: string; value: SearchTab }> = [
  { label: messages.search.tabs.routines, value: 'routines' },
  { label: messages.search.tabs.accounts, value: 'accounts' },
];

export function SearchPage({ service = searchService }: SearchPageProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('routines');
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [searchVersion, setSearchVersion] = useState(0);
  const [selectedTags, setSelectedTags] = useState<SearchTag[]>([]);
  const [pickupTags, setPickupTags] = useState<SearchTag[]>([]);
  const [allTags, setAllTags] = useState<SearchTag[] | null>(null);
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [isAllTagsLoading, setIsAllTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState(false);
  const [allTagsError, setAllTagsError] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagsReloadVersion, setTagsReloadVersion] = useState(0);
  const [allTagsReloadVersion, setAllTagsReloadVersion] = useState(0);
  const [isInputPending, setIsInputPending] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
        <AppBrandHeader onSearchClick={() => inputRef.current?.focus()} />
        <Tabs aria-label={messages.search.tabsAriaLabel} onChange={(_, value: SearchTab) => changeTab(value)} value={activeTab}>
          {tabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
        </Tabs>
        <Box className="search-page__form">
          <TextField
            fullWidth
            inputRef={inputRef}
            label={activeTab === 'routines' ? messages.search.routinesInputLabel : messages.search.accountsInputLabel}
            onChange={(event) => changeInput(event.target.value)}
            placeholder={activeTab === 'routines' ? messages.search.routinesInputPlaceholder : messages.search.accountsInputPlaceholder}
            value={input}
          />
        </Box>
        <Box aria-busy={isTagsLoading || isAllTagsLoading} aria-label={messages.search.tagsLabel}>{isTagsLoading ? null : tagsError ? <Alert action={<Button onClick={() => setTagsReloadVersion((version) => version + 1)}>{messages.search.retry}</Button>} severity="error">{messages.search.tagsError}</Alert> : <><Stack className="search-page__tags" direction="row">{visibleTags.map((tag) => <Button aria-pressed={selectedTags.some((selected) => selected.identifier === tag.identifier)} key={tag.identifier} onClick={() => toggleTag(tag)} size="small" variant={selectedTags.some((selected) => selected.identifier === tag.identifier) ? 'contained' : 'outlined'}>{tag.label}</Button>)}</Stack>{showAllTags ? <><Button onClick={() => setShowAllTags(false)} size="small">{messages.search.closeAllTags}</Button>{allTagsError && <Alert action={<Button onClick={() => { setAllTagsError(false); setIsAllTagsLoading(true); setAllTagsReloadVersion((version) => version + 1); }}>{messages.search.retry}</Button>} severity="error">{messages.search.tagsError}</Alert>}</> : <Button onClick={() => { setIsAllTagsLoading(true); setShowAllTags(true); }} size="small">{messages.search.showAllTags}</Button>}</>}</Box>
      </Box>

      <Box className="search-page__content">
        {!isInputPending && (normalizedQuery.length > 0 || selectedTags.length > 0) && <SearchResults activeTab={activeTab} key={resultsKey} query={normalizedQuery} service={service} tagIdentifiers={tagIdentifiers} />}
      </Box>
    </Box>
  );
}

function SearchResults({ activeTab, query, service, tagIdentifiers }: { activeTab: SearchTab; query: string; service: SearchService; tagIdentifiers: string[] }) {
  const fetchPage = useCallback((page: number) => tagIdentifiers.length > 0 ? service.searchPage(activeTab, query, page, tagIdentifiers) : service.searchPage(activeTab, query, page), [activeTab, query, service, tagIdentifiers]);
  const list = useInfiniteList<SearchResult>({ fetchPage, key: `${activeTab}:${query}` });
  const hasMore = list.total !== null && list.items.length < list.total;

  if (list.isInitialLoading) return <Loading />;
  if (list.error) return <Alert action={<Button color="inherit" onClick={list.retry}>{messages.search.retry}</Button>} icon={<ErrorOutlineOutlinedIcon />} severity="error">{messages.search.error}</Alert>;
  if (list.items.length === 0) return <Empty tab={activeTab} />;

  return (
    <Stack className="search-page__results">
      {list.items.map((item) => isRoutineResult(item)
        ? <RoutineResultCard item={item} key={`${item.itemType}:${item.routineId}:${item.routineExecutionId ?? ''}:${item.publishedAt}`} />
        : <AccountResultCard item={item} key={item.accountId} />)}
      {hasMore && <Button disabled={list.isLoadingMore} onClick={list.loadNextPage} variant="outlined">{messages.search.loadMore}</Button>}
      {list.isLoadingMore && <Typography className="search-page__load-more-loading">{messages.search.loadMoreLoading}</Typography>}
    </Stack>
  );
}

function isRoutineResult(item: SearchResult): item is RoutineSearchResult {
  return 'itemType' in item;
}

function Loading() {
  return <Stack className="search-page__loading"><CircularProgress aria-label={messages.search.loading} /><Typography>{messages.search.loading}</Typography></Stack>;
}

function Empty({ tab }: { tab: SearchTab }) {
  return <Typography className="search-page__empty">{tab === 'routines' ? messages.search.routinesEmpty : messages.search.accountsEmpty}</Typography>;
}

function RoutineResultCard({ item }: { item: RoutineSearchResult }) {
  const detailPath = item.itemType === 'routine_execution' && item.routineExecutionId !== null
    ? `/routines/${item.routineId}/executions/${item.routineExecutionId}`
    : `/routines/${item.routineId}`;
  return (
    <article className="search-routine-card">
      <div className="search-routine-card__header">
        <div className="search-routine-card__author"><AccountAvatar className="search-routine-card__avatar" iconImageUrl={item.iconImageUrl} initial={item.accountName.slice(0, 1)} /><Link to={`/accounts/${item.accountId}`}>{item.accountName}</Link></div>
        <div className="search-routine-card__metadata"><span>{item.itemType === 'routine' ? messages.search.routinePost : messages.search.routineExecutionPost}</span><span>{formatPostedAt(item.publishedAt)}</span></div>
      </div>
      <Typography component="h2"><Link to={detailPath}>{item.routineName}</Link></Typography>
      <div className="search-routine-card__tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </article>
  );
}

function AccountResultCard({ item }: { item: AccountSearchResult }) {
  return <article className="search-account-card"><AccountAvatar className="search-account-card__avatar" iconImageUrl={item.iconImageUrl} initial={item.accountName.slice(0, 1)} /><span><Link aria-label={item.accountName} className="search-account-card__content" to={`/accounts/${item.accountId}`}><strong>{item.accountName}</strong></Link>{item.bio !== null && <span>{item.bio}</span>}</span></article>;
}
