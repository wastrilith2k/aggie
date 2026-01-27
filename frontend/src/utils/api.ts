import type { SearchRequest, SearchResponse } from '../types/search.types';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

if (!N8N_WEBHOOK_URL) {
  console.warn(
    'VITE_N8N_WEBHOOK_URL is not set. Please configure your .env file.'
  );
}

/**
 * Performs a search against the n8n webhook endpoint
 * @param request - The search request containing the query
 * @returns Promise with search results
 */
export async function performSearch(
  request: SearchRequest
): Promise<SearchResponse> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error(
      'n8n webhook URL not configured. Please set VITE_N8N_WEBHOOK_URL in your .env file.'
    );
  }

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  const data: SearchResponse = await response.json();
  return data;
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
