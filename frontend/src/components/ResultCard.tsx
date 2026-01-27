import { ExternalLink } from 'lucide-react';
import type { SearchResult } from '../types/search.types';
import { SourceIcon } from './SourceIcon';

/**
 * Decodes HTML entities in a string (e.g., &#39; -> ')
 */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

interface ResultCardProps {
  result: SearchResult;
  isSelected: boolean;
}

/**
 * Formats a date string for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  } catch {
    return '';
  }
}

export function ResultCard({ result, isSelected }: ResultCardProps) {
  return (
    <article
      className={`
        group p-4 rounded-lg border transition-all duration-200
        ${
          isSelected
            ? 'border-primary-900 dark:border-primary-100 bg-primary-50 dark:bg-primary-800'
            : 'border-primary-100 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-600'
        }
      `}
      role="article"
      aria-label={`${result.source} result: ${decodeHtmlEntities(result.title)}`}
    >
      <div className="flex items-start gap-3">
        {/* Source icon */}
        <div
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                        rounded-md bg-primary-100 dark:bg-primary-800
                        text-primary-600 dark:text-primary-400"
        >
          <SourceIcon source={result.source} size={18} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100 truncate">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline focus:outline-none focus:underline"
              >
                {decodeHtmlEntities(result.title)}
              </a>
            </h3>

            {/* Open link button */}
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1.5 rounded-md
                         text-primary-400 hover:text-primary-600
                         dark:hover:text-primary-300
                         opacity-0 group-hover:opacity-100
                         focus:opacity-100 transition-all"
              aria-label={`Open ${decodeHtmlEntities(result.title)} in new tab`}
            >
              <ExternalLink size={16} />
            </a>
          </div>

          {/* Snippet */}
          <p className="mt-1 text-sm text-primary-500 dark:text-primary-400 line-clamp-2">
            {decodeHtmlEntities(result.snippet)}
          </p>

          {/* Meta info */}
          <div className="mt-2 flex items-center gap-3 text-xs text-primary-400 dark:text-primary-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5
                             bg-primary-100 dark:bg-primary-800 rounded">
              {result.source}
            </span>
            {result.date && <span>{formatDate(result.date)}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
