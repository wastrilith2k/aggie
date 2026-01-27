import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import type { ServiceError } from '../types/search.types';

interface ErrorBannerProps {
  errors: ServiceError[];
}

export function ErrorBanner({ errors }: ErrorBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || errors.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/50
                 border border-amber-200 dark:border-amber-800
                 rounded-xl animate-fade-in"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          className="flex-shrink-0 text-amber-600 dark:text-amber-500 mt-0.5"
        />
        <div className="flex-1">
          <h3 className="font-medium text-amber-900 dark:text-amber-200">
            Some services encountered errors
          </h3>
          <ul className="mt-2 space-y-1">
            {errors.map((error, idx) => (
              <li
                key={`${error.source}-${idx}`}
                className="text-sm text-amber-700 dark:text-amber-300"
              >
                <span className="font-medium">{error.source}:</span>{' '}
                {error.message}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Results from other services are shown below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 p-1 text-amber-500 hover:text-amber-700
                     dark:hover:text-amber-300 transition-colors"
          aria-label="Dismiss warning"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
