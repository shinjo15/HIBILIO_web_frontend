import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { AccountAvatar } from '../../../shared/components/AccountImage';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import messages from '../../../shared/message/message.json';
import { formatPostedAt } from '../../routineFeed/domain/routine';
import { searchService, type AccountSearchResult, type RoutineSearchResult, type SearchResult, type SearchService, type SearchTab } from '../services/searchService';
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
  const normalizedQuery = submittedQuery?.trim() ?? '';
  const resultsKey = `${activeTab}:${normalizedQuery}:${searchVersion}`;

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (query.length === 0) return;
    setSubmittedQuery(query);
    setSearchVersion((version) => version + 1);
  }

  function changeInput(value: string) {
    setInput(value);
    if (submittedQuery !== null && value.trim() !== submittedQuery) setSubmittedQuery(null);
  }

  return (
    <Box component="section" className="search-page">
      <Box className="search-page__header">
        <Typography component="h1" className="search-page__title">{messages.search.title}</Typography>
        <Tabs aria-label={messages.search.tabsAriaLabel} onChange={(_, value: SearchTab) => setActiveTab(value)} value={activeTab}>
          {tabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
        </Tabs>
        <Box component="form" className="search-page__form" onSubmit={submitSearch}>
          <TextField
            fullWidth
            label={messages.search.inputLabel}
            onChange={(event) => changeInput(event.target.value)}
            placeholder={messages.search.inputPlaceholder}
            value={input}
          />
          <Button startIcon={<SearchOutlinedIcon />} type="submit" variant="contained">{messages.search.submit}</Button>
        </Box>
      </Box>

      <Box className="search-page__content">
        {normalizedQuery.length > 0 && <SearchResults activeTab={activeTab} key={resultsKey} query={normalizedQuery} service={service} />}
      </Box>
    </Box>
  );
}

function SearchResults({ activeTab, query, service }: { activeTab: SearchTab; query: string; service: SearchService }) {
  const fetchPage = useCallback((page: number) => service.searchPage(activeTab, query, page), [activeTab, query, service]);
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
