import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import type {
  SearchResponse,
  BackendSearchSource,
} from '../types/search.types';

interface SearchRequest {
  query: string;
  accountId: string;
}

interface BackendSearchResult {
  source: BackendSearchSource;
  title: string;
  snippet: string;
  url: string;
  date: string;
  relevance: number;
  metadata: Record<string, unknown>;
}

interface BackendSearchResponse {
  success: boolean;
  query: string;
  totalResults: number;
  errors: Array<{
    service: BackendSearchSource;
    message: string;
    code?: string;
  }>;
  hasErrors: boolean;
  results: BackendSearchResult[];
  message?: string;
}

// Map backend source IDs to display names
const SOURCE_NAMES: Record<BackendSearchSource, string> = {
  'google-drive': 'Google Drive',
  'gmail': 'Gmail',
  'google-calendar': 'Google Calendar',
  'onedrive': 'OneDrive',
  'trello': 'Trello',
};

/**
 * Performs a search via Firebase Cloud Functions
 * @param request - The search request containing query and accountId
 * @returns Promise with search results
 */
export async function performSearch(
  request: SearchRequest
): Promise<SearchResponse> {
  const searchFn = httpsCallable<SearchRequest, BackendSearchResponse>(
    functions,
    'search'
  );

  const result = await searchFn(request);
  const data = result.data;

  // Transform backend response to frontend format
  // Map source IDs to display names
  const transformedResults = data.results.map(result => ({
    ...result,
    source: SOURCE_NAMES[result.source] as SearchResponse['results'][0]['source'],
    metadata: result.metadata,
  }));

  return {
    success: data.success,
    query: data.query,
    totalResults: data.totalResults,
    errors: data.errors,
    hasErrors: data.hasErrors,
    results: transformedResults,
  };
}

/** Local storage key for recent searches */
const RECENT_SEARCHES_KEY = 'noteSearch:recentSearches';
const MAX_RECENT_SEARCHES = 10;

export interface StoredRecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
}

/**
 * Gets recent searches from localStorage
 */
export function getRecentSearches(): StoredRecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as StoredRecentSearch[];
  } catch {
    return [];
  }
}

/**
 * Saves a search to recent searches
 */
export function saveRecentSearch(query: string, resultCount: number): void {
  try {
    const searches = getRecentSearches();

    // Remove duplicate if exists
    const filtered = searches.filter(
      (s) => s.query.toLowerCase() !== query.toLowerCase()
    );

    // Add new search at the beginning
    filtered.unshift({
      query,
      timestamp: Date.now(),
      resultCount,
    });

    // Keep only the most recent
    const trimmed = filtered.slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clears all recent searches
 */
export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Silently fail
  }
}
