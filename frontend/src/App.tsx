import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SearchBar,
  ResultsGroup,
  LoadingState,
  EmptyState,
  ErrorBanner,
  ErrorState,
  ThemeToggle,
} from './components';
import { useSearch } from './hooks/useSearch';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SearchDashboard() {
  const {
    query,
    setQuery,
    executeSearch,
    data,
    groupedResults,
    isLoading,
    isError,
    error,
    searchTime,
    recentSearches,
    clearRecent,
    selectRecentSearch,
    selectedIndex,
    setSelectedIndex,
    flatResults,
  } = useSearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const hasSearched = !!data;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case 'j':
          // Move down
          e.preventDefault();
          setSelectedIndex(
            Math.min(selectedIndex + 1, flatResults.length - 1)
          );
          break;
        case 'k':
          // Move up
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, -1));
          break;
        case 'Enter':
          // Open selected result
          if (selectedIndex >= 0 && flatResults[selectedIndex]) {
            window.open(flatResults[selectedIndex].url, '_blank');
          }
          break;
        case '/':
          // Focus search
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[type="text"]'
          );
          searchInput?.focus();
          break;
      }
    },
    [selectedIndex, flatResults, setSelectedIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-primary-950 transition-colors">
      {/* Header */}
      <header className="border-b border-primary-100 dark:border-primary-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary-900 dark:text-primary-100">
            Note Search
          </h1>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs
                           bg-primary-100 dark:bg-primary-800
                           text-primary-500 dark:text-primary-400
                           rounded border border-primary-200 dark:border-primary-700">
              /
            </kbd>
            <span className="hidden sm:inline text-xs text-primary-400 dark:text-primary-500">
              to search
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search bar */}
        <SearchBar
          query={query}
          setQuery={setQuery}
          onSearch={executeSearch}
          isLoading={isLoading}
          recentSearches={recentSearches}
          onSelectRecent={selectRecentSearch}
          onClearRecent={clearRecent}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
        />

        {/* Results section */}
        <div className="mt-8">
          {/* Search stats */}
          {data && data.totalResults > 0 && (
            <div className="mb-6 flex items-center justify-between text-sm text-primary-500 dark:text-primary-400">
              <span>
                Found {data.totalResults} result
                {data.totalResults !== 1 ? 's' : ''} for "
                <span className="font-medium text-primary-700 dark:text-primary-300">
                  {data.query}
                </span>
                "
              </span>
              {searchTime !== null && (
                <span>{(searchTime / 1000).toFixed(2)}s</span>
              )}
            </div>
          )}

          {/* Error banner for partial failures */}
          {data?.hasErrors && <ErrorBanner errors={data.errors} />}

          {/* Loading state */}
          {isLoading && <LoadingState />}

          {/* Error state */}
          {isError && error && (
            <ErrorState error={error} onRetry={executeSearch} />
          )}

          {/* Empty state */}
          {!isLoading &&
            !isError &&
            (!data || data.totalResults === 0) && (
              <EmptyState query={query} hasSearched={hasSearched} />
            )}

          {/* Results grouped by source */}
          {!isLoading && !isError && groupedResults.length > 0 && (
            <div className="space-y-6">
              {groupedResults.map((group) => (
                <ResultsGroup
                  key={group.source}
                  group={group}
                  selectedIndex={selectedIndex}
                  flatResults={flatResults}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary-100 dark:border-primary-800 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-primary-400 dark:text-primary-500">
            <span>
              <kbd className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-800 rounded">
                j
              </kbd>
              /
              <kbd className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-800 rounded">
                k
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-800 rounded">
                Enter
              </kbd>{' '}
              open
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-800 rounded">
                /
              </kbd>{' '}
              focus search
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SearchDashboard />
    </QueryClientProvider>
  );
}
