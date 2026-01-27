import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import type {
  SearchResponse,
  SearchResult,
  SearchSource,
  GroupedResults,
} from '../types/search.types';
import {
  performSearch,
  saveRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  type StoredRecentSearch,
} from '../utils/api';

/** All available sources in display order */
const SOURCE_ORDER: SearchSource[] = [
  'Google Drive',
  'Gmail',
  'Google Calendar',
  'OneDrive',
  'Trello',
];

/**
 * Groups search results by their source
 */
function groupResultsBySource(results: SearchResult[]): GroupedResults[] {
  const groups = new Map<SearchSource, SearchResult[]>();

  // Initialize all sources (even empty ones won't be shown)
  for (const source of SOURCE_ORDER) {
    groups.set(source, []);
  }

  // Group results
  for (const result of results) {
    const existing = groups.get(result.source) || [];
    existing.push(result);
    groups.set(result.source, existing);
  }

  // Convert to array, filtering out empty groups
  return SOURCE_ORDER.filter((source) => (groups.get(source)?.length || 0) > 0).map(
    (source) => ({
      source,
      results: groups.get(source) || [],
      isCollapsed: false,
    })
  );
}

interface UseSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  executeSearch: () => void;

  // Results
  data: SearchResponse | undefined;
  groupedResults: GroupedResults[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Timing
  searchTime: number | null;

  // Recent searches
  recentSearches: StoredRecentSearch[];
  clearRecent: () => void;
  selectRecentSearch: (query: string) => void;

  // Keyboard navigation
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  flatResults: SearchResult[];
}

export function useSearch(): UseSearchReturn {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<StoredRecentSearch[]>(
    []
  );
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Perform the search query
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<SearchResponse, Error>({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      const startTime = performance.now();
      const result = await performSearch({ query: searchQuery });
      const endTime = performance.now();
      setSearchTime(endTime - startTime);

      // Save to recent searches
      if (searchQuery.trim()) {
        saveRecentSearch(searchQuery, result.totalResults);
        setRecentSearches(getRecentSearches());
      }

      return result;
    },
    enabled: searchQuery.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Execute search
  const executeSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) {
      setSelectedIndex(-1);
      setSearchQuery(trimmed);
      // Invalidate previous query to force refetch
      queryClient.invalidateQueries({ queryKey: ['search', trimmed] });
    }
  }, [query, queryClient]);

  // Select a recent search
  const selectRecentSearch = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    setSearchQuery(recentQuery);
    setSelectedIndex(-1);
  }, []);

  // Clear recent searches
  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Group results by source
  const groupedResults = data ? groupResultsBySource(data.results) : [];

  // Flatten results for keyboard navigation
  const flatResults = data?.results || [];

  return {
    query,
    setQuery,
    executeSearch,
    data,
    groupedResults,
    isLoading: isLoading || isFetching,
    isError,
    error: error || null,
    searchTime,
    recentSearches,
    clearRecent,
    selectRecentSearch,
    selectedIndex,
    setSelectedIndex,
    flatResults,
  };
}
