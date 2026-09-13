/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';

export type PageResult<Item> = { items: Item[]; total: number };

type UseInfiniteListOptions<Item> = {
  enabled?: boolean;
  fetchPage: (page: number) => Promise<PageResult<Item>>;
  key: string;
  onError?: (error: unknown) => void;
  preserveWhenDisabled?: boolean;
};

export function useInfiniteList<Item>({ enabled = true, fetchPage, key, onError, preserveWhenDisabled = false }: UseInfiniteListOptions<Item>) {
  const [items, setItems] = useState<Item[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(enabled);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const nextPage = useRef(1);
  const loading = useRef(false);
  const generation = useRef(0);
  const loaded = useRef(false);
  const initializedKey = useRef<string | null>(null);
  const itemCount = useRef(0);
  const latestTotal = useRef<number | null>(null);

  const load = useCallback(async (reset: boolean) => {
    if (loading.current) return;
    loading.current = true;
    const page = reset ? 1 : nextPage.current;
    if (reset) {
      setIsInitialLoading(true);
      setItems([]);
      setTotal(null);
      nextPage.current = 1;
    } else {
      setIsLoadingMore(true);
    }
    setError(false);
    const currentGeneration = generation.current;
    try {
      const result = await fetchPage(page);
      if (generation.current !== currentGeneration) return;
      setItems((current) => {
        const nextItems = reset ? result.items : [...current, ...result.items];
        itemCount.current = nextItems.length;
        return nextItems;
      });
      setTotal(result.total);
      latestTotal.current = result.total;
      nextPage.current = page + 1;
      loaded.current = true;
    } catch (error) {
      if (generation.current === currentGeneration) {
        onError?.(error);
        setError(true);
      }
    } finally {
      if (generation.current === currentGeneration) {
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
      loading.current = false;
    }
  }, [fetchPage, onError]);

  useEffect(() => {
    generation.current += 1;
    loading.current = false;
    if (!enabled) {
      if (!preserveWhenDisabled) {
        setItems([]);
        setTotal(null);
        itemCount.current = 0;
        latestTotal.current = null;
        setError(false);
        setIsInitialLoading(false);
        loaded.current = false;
      }
      return;
    }
    const keyChanged = initializedKey.current !== key;
    initializedKey.current = key;
    if (preserveWhenDisabled && loaded.current && !keyChanged) return;
    void load(true);
  }, [enabled, key, load, preserveWhenDisabled]);

  const loadNextPage = useCallback(() => {
    if (latestTotal.current === null || itemCount.current >= latestTotal.current || loading.current) return;
    void load(false);
  }, [load]);

  const sentinelRef = useCallback((element: Element | null) => {
    if (element === null || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadNextPage();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadNextPage]);

  return { error, isInitialLoading, isLoadingMore, items, loadNextPage, retry: () => void load(items.length === 0), sentinelRef, setItems, total };
}
