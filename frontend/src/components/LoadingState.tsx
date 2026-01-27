import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16"
      role="status"
      aria-label="Loading search results"
    >
      <Loader2
        size={40}
        className="text-primary-400 dark:text-primary-500 animate-spin"
      />
      <p className="mt-4 text-primary-500 dark:text-primary-400">
        Searching across all services...
      </p>
    </div>
  );
}
