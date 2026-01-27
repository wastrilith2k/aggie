import { useRef, useEffect, type KeyboardEvent } from 'react';
import { Search, X, Clock, Trash2 } from 'lucide-react';
import type { StoredRecentSearch } from '../utils/api';

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  recentSearches: StoredRecentSearch[];
  onSelectRecent: (query: string) => void;
  onClearRecent: () => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
}

export function SearchBar({
  query,
  setQuery,
  onSearch,
  isLoading,
  recentSearches,
  onSelectRecent,
  onClearRecent,
  showSuggestions,
  setShowSuggestions,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowSuggestions(false);
      onSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Filter suggestions based on current query
  const filteredSuggestions = query.trim()
    ? recentSearches.filter((s) =>
        s.query.toLowerCase().includes(query.toLowerCase())
      )
    : recentSearches;

  const handleSelectSuggestion = (suggestionQuery: string) => {
    onSelectRecent(suggestionQuery);
    setShowSuggestions(false);
    onSearch();
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400">
          <Search size={20} aria-hidden="true" />
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search across all your notes..."
          className="w-full h-14 pl-12 pr-24 bg-white dark:bg-primary-900
                     border-2 border-primary-200 dark:border-primary-700
                     rounded-xl text-primary-900 dark:text-primary-100
                     placeholder:text-primary-400 dark:placeholder:text-primary-500
                     focus:outline-none focus:border-primary-900 dark:focus:border-primary-100
                     transition-colors duration-200"
          aria-label="Search query"
          aria-describedby="search-hint"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-20 top-1/2 -translate-y-1/2 p-1.5
                       text-primary-400 hover:text-primary-600
                       dark:hover:text-primary-300 transition-colors"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}

        {/* Search button */}
        <button
          type="button"
          onClick={() => {
            setShowSuggestions(false);
            onSearch();
          }}
          disabled={isLoading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2
                     px-4 py-2 bg-primary-900 dark:bg-primary-100
                     text-white dark:text-primary-900
                     rounded-lg font-medium text-sm
                     hover:bg-primary-800 dark:hover:bg-primary-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200"
          aria-label="Search"
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            'Search'
          )}
        </button>
      </div>

      {/* Search hint */}
      <p
        id="search-hint"
        className="mt-2 text-xs text-primary-400 dark:text-primary-500 text-center"
      >
        Press Enter to search or use j/k to navigate results
      </p>

      {/* Recent searches dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2
                     bg-white dark:bg-primary-900
                     border border-primary-200 dark:border-primary-700
                     rounded-xl shadow-lg overflow-hidden z-50
                     animate-fade-in"
          role="listbox"
          aria-label="Recent searches"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-primary-100 dark:border-primary-800">
            <span className="text-xs font-medium text-primary-500 dark:text-primary-400 uppercase tracking-wide">
              Recent Searches
            </span>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-xs text-primary-400 hover:text-primary-600
                         dark:hover:text-primary-300 flex items-center gap-1
                         transition-colors"
              aria-label="Clear recent searches"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {filteredSuggestions.map((search, index) => (
              <li key={`${search.query}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(search.query)}
                  className="w-full px-4 py-3 flex items-center gap-3
                             hover:bg-primary-50 dark:hover:bg-primary-800
                             transition-colors text-left"
                  role="option"
                >
                  <Clock
                    size={16}
                    className="text-primary-400 dark:text-primary-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-900 dark:text-primary-100 truncate">
                      {search.query}
                    </p>
                    <p className="text-xs text-primary-400 dark:text-primary-500">
                      {search.resultCount} results
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
