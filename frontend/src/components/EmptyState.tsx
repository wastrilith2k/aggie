import { SearchX, FileSearch } from 'lucide-react';

interface EmptyStateProps {
  query: string;
  hasSearched: boolean;
}

export function EmptyState({ query, hasSearched }: EmptyStateProps) {
  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-16 h-16 flex items-center justify-center rounded-full
                        bg-primary-100 dark:bg-primary-800
                        text-primary-400 dark:text-primary-500"
        >
          <FileSearch size={32} />
        </div>
        <h2 className="mt-6 text-xl font-medium text-primary-900 dark:text-primary-100">
          Search your notes
        </h2>
        <p className="mt-2 text-primary-500 dark:text-primary-400 max-w-md">
          Search across Google Drive, Trello, Gmail, OneDrive, and Google
          Calendar all at once.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-16 h-16 flex items-center justify-center rounded-full
                      bg-primary-100 dark:bg-primary-800
                      text-primary-400 dark:text-primary-500"
      >
        <SearchX size={32} />
      </div>
      <h2 className="mt-6 text-xl font-medium text-primary-900 dark:text-primary-100">
        No results found
      </h2>
      <p className="mt-2 text-primary-500 dark:text-primary-400 max-w-md">
        No results found for "<span className="font-medium">{query}</span>".
        <br />
        Try different keywords or check your service connections.
      </p>
    </div>
  );
}
