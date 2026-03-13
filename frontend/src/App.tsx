import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Settings, AlertCircle } from 'lucide-react';
import {
  SearchBar,
  ResultsGroup,
  LoadingState,
  EmptyState,
  ErrorBanner,
  ErrorState,
  ThemeToggle,
} from './components';
import { Login } from './components/Login';
import { useSearch } from './hooks/useSearch';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import { AccountProvider, useAccount } from './contexts/AccountContext';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type Page = 'search' | 'settings';

interface SearchDashboardProps {
  onNavigate: (page: Page) => void;
}

function SearchDashboard({ onNavigate }: SearchDashboardProps) {
  const { user, signOut } = useAuth();
  const { services, loading: accountLoading } = useAccount();
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
        case '/': {
          // Focus search
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[type="text"]'
          );
          searchInput?.focus();
          break;
        }
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
          <div className="flex items-center gap-3">
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs
                           bg-primary-100 dark:bg-primary-800
                           text-primary-500 dark:text-primary-400
                           rounded border border-primary-200 dark:border-primary-700">
              /
            </kbd>
            <span className="hidden sm:inline text-xs text-primary-400 dark:text-primary-500">
              to search
            </span>
            <button
              onClick={() => onNavigate('settings')}
              className="p-2 text-primary-500 hover:text-primary-700
                         dark:text-primary-400 dark:hover:text-primary-200
                         transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                )}
                <button
                  onClick={signOut}
                  className="text-xs text-primary-500 hover:text-primary-700
                             dark:text-primary-400 dark:hover:text-primary-200"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* No services connected banner */}
        {!accountLoading && services.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  No services connected
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Connect Google, Microsoft, or Trello to start searching your notes.
                </p>
                <button
                  onClick={() => onNavigate('settings')}
                  className="mt-2 text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Go to Settings →
                </button>
              </div>
            </div>
          </div>
        )}

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

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('search');

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/settings') {
        setCurrentPage('settings');
      } else {
        setCurrentPage('search');
      }
    };

    // Set initial state from URL
    handlePopState();

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
    const path = page === 'settings' ? '/settings' : '/';
    window.history.pushState({}, '', path);
  }, []);

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => navigate('search')} />;
  }

  return <SearchDashboard onNavigate={navigate} />;
}

function AuthenticatedApp() {
  const { user, loading, isAuthorized } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 dark:bg-primary-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <Login />;
  }

  return (
    <AccountProvider>
      <AppContent />
    </AccountProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}
