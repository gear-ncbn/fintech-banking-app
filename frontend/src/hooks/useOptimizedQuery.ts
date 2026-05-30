import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '@/utils/PerformanceMonitor';

interface QueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  initialData?: T;
}

interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

// Simple in-memory cache
const queryCache = new Map<string, {
  data: unknown;
  timestamp: number;
  error?: Error;
}>();

// Cache invalidation subscribers
const cacheSubscribers = new Map<string, Set<() => void>>();

export function useOptimizedQuery<T>(options: QueryOptions<T>): QueryResult<T> {
  const {
    queryKey,
    queryFn,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchInterval,
    refetchOnWindowFocus = true,
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    enabled = true,
    initialData
  } = options;

  const cacheKey = JSON.stringify(queryKey);
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if data is stale
  const isStale = Date.now() - lastFetchTime > staleTime;

  // Get cached data
  const getCachedData = useCallback(() => {
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached;
    }
    return null;
  }, [cacheKey, cacheTime]);

  // Set cache data
  const setCacheData = useCallback((data: T, error?: Error) => {
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      error
    });

    // Notify subscribers
    const subscribers = cacheSubscribers.get(cacheKey);
    if (subscribers) {
      subscribers.forEach(callback => callback());
    }
  }, [cacheKey]);

  // Subscribe to cache updates
  const subscribeToCacheUpdates = useCallback((callback: () => void) => {
    if (!cacheSubscribers.has(cacheKey)) {
      cacheSubscribers.set(cacheKey, new Set());
    }
    cacheSubscribers.get(cacheKey)!.add(callback);

    return () => {
      cacheSubscribers.get(cacheKey)?.delete(callback);
    };
  }, [cacheKey]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = getCachedData();
    if (cached && !isStale) {
      setData(cached.data as T);
      setError(cached.error || null);
      setLastFetchTime(cached.timestamp);
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      performanceMonitor.mark(`query-start-${cacheKey}`);
      
      const result = await queryFn();
      
      const duration = performance.now() - startTime;
      performanceMonitor.trackAPIRequest(cacheKey, duration, true);
      
      setData(result);
      setCacheData(result);
      setLastFetchTime(Date.now());
      retryCountRef.current = 0;
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (_err) {
      const duration = performance.now() - startTime;
      performanceMonitor.trackAPIRequest(cacheKey, duration, false);

      if ((_err as Error).name === 'AbortError') {
        return;
      }

      const error = _err as Error;
      setError(error);

      // Retry logic
      if (retryCountRef.current < retry) {
        retryCountRef.current++;
        setTimeout(() => {
          fetchData();
        }, retryDelay * Math.pow(2, retryCountRef.current - 1)); // Exponential backoff
      } else {
        setCacheData(data as T, error);
        if (onError) {
          onError(error);
        }
      }
    } finally {
      setIsLoading(false);
      performanceMonitor.measure(`query-${cacheKey}`, `query-start-${cacheKey}`);
    }
  }, [enabled, getCachedData, isStale, cacheKey, queryFn, data, setCacheData, onSuccess, retry, retryDelay, onError]);

  // Refetch function
  const refetch = useCallback(async () => {
    retryCountRef.current = 0;
    await fetchData();
  }, [fetchData]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    queryCache.delete(cacheKey);
    setLastFetchTime(0);
    refetch();
  }, [cacheKey, refetch]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Only run on mount and when enabled changes

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        refetch();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, refetch]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (isStale) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, isStale, refetch]);

  // Subscribe to cache updates
  useEffect(() => {
    const handleCacheUpdate = () => {
      const cached = getCachedData();
      if (cached) {
        setData(cached.data as T);
        setError(cached.error || null);
        setLastFetchTime(cached.timestamp);
      }
    };

    return subscribeToCacheUpdates(handleCacheUpdate);
  }, [getCachedData, subscribeToCacheUpdates]);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== undefined && error === null,
    isStale,
    refetch,
    invalidate
  };
}

// Mutation hook for optimistic updates
interface MutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => Promise<unknown> | unknown;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context?: unknown) => void;
  onSettled?: (data?: TData, error?: Error, variables?: TVariables) => void;
}

interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: () => void;
}

export function useOptimizedMutation<TData = unknown, TVariables = void>(
  options: MutationOptions<TData, TVariables>
): MutationResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | undefined>();

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(undefined);
  }, []);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setError(null);

    let context: unknown;
    const startTime = performance.now();

    try {
      // Optimistic update
      if (options.onMutate) {
        context = await options.onMutate(variables);
      }

      performanceMonitor.mark('mutation-start');
      const result = await options.mutationFn(variables);
      
      const duration = performance.now() - startTime;
      performanceMonitor.trackAPIRequest('mutation', duration, true);

      setData(result);

      if (options.onSuccess) {
        options.onSuccess(result, variables);
      }

      return result;
    } catch (err) {
      const duration = performance.now() - startTime;
      performanceMonitor.trackAPIRequest('mutation', duration, false);

      const error = err as Error;
      setError(error);

      if (options.onError) {
        options.onError(error, variables, context);
      }

      throw error;
    } finally {
      setIsLoading(false);
      performanceMonitor.measure('mutation', 'mutation-start');

      if (options.onSettled) {
        options.onSettled(data, error ?? undefined, variables);
      }
    }
  }, [options, data, error]);

  const mutate = useCallback((variables: TVariables) => {
    return mutateAsync(variables).then(() => undefined).catch(() => {
      // Error is already handled in mutateAsync
    });
  }, [mutateAsync]);

  return {
    mutate,
    mutateAsync,
    isLoading,
    isError: error !== null,
    isSuccess: data !== undefined && error === null,
    error,
    data,
    reset
  };
}

// Prefetch function
export function prefetchQuery<T>(options: QueryOptions<T>): Promise<void> {
  const cacheKey = JSON.stringify(options.queryKey);
  
  return options.queryFn().then(data => {
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  });
}

// Invalidate queries function
export function invalidateQueries(keyPrefix?: string[]): void {
  if (!keyPrefix) {
    queryCache.clear();
    return;
  }

  const prefix = JSON.stringify(keyPrefix);
  const keysToDelete: string[] = [];

  queryCache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => {
    queryCache.delete(key);
    
    // Notify subscribers
    const subscribers = cacheSubscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback());
    }
  });
}