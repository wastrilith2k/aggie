import { AlertTriangle } from 'lucide-react';
import type { ServiceError, BackendSearchSource, SOURCE_DISPLAY_NAMES } from '../types/search.types';
import { SourceIcon } from './SourceIcon';

// Map backend source IDs to display names
const SERVICE_DISPLAY_NAMES: Record<BackendSearchSource, string> = {
  'google-drive': 'Google Drive',
  'gmail': 'Gmail',
  'google-calendar': 'Google Calendar',
  'onedrive': 'OneDrive',
  'trello': 'Trello',
};

interface ServiceErrorCardProps {
  error: ServiceError;
}

export function ServiceErrorCard({ error }: ServiceErrorCardProps) {
  const displayName = SERVICE_DISPLAY_NAMES[error.service] || error.service;

  return (
    <div
      className="p-4 rounded-lg border border-amber-200 dark:border-amber-800
                 bg-amber-50 dark:bg-amber-950/30"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                        rounded-md bg-amber-100 dark:bg-amber-900
                        text-amber-600 dark:text-amber-400"
        >
          <SourceIcon source={displayName as typeof SOURCE_DISPLAY_NAMES[BackendSearchSource]} size={18} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {displayName}
            </h3>
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {error.message}
          </p>
        </div>
      </div>
    </div>
  );
}
