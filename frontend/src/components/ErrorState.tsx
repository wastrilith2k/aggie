import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      role="alert"
    >
      <div
        className="w-16 h-16 flex items-center justify-center rounded-full
                      bg-red-100 dark:bg-red-950
                      text-red-500 dark:text-red-400"
      >
        <AlertCircle size={32} />
      </div>
      <h2 className="mt-6 text-xl font-medium text-primary-900 dark:text-primary-100">
        Search failed
      </h2>
      <p className="mt-2 text-primary-500 dark:text-primary-400 max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2
                   bg-primary-900 dark:bg-primary-100
                   text-white dark:text-primary-900
                   rounded-lg font-medium text-sm
                   hover:bg-primary-800 dark:hover:bg-primary-200
                   transition-colors"
      >
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
}
