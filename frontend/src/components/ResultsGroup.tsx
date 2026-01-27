import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { GroupedResults, SearchResult } from '../types/search.types';
import { ResultCard } from './ResultCard';
import { SourceIcon } from './SourceIcon';

interface ResultsGroupProps {
  group: GroupedResults;
  selectedIndex: number;
  flatResults: SearchResult[];
}

export function ResultsGroup({
  group,
  selectedIndex,
  flatResults,
}: ResultsGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section
      className="animate-slide-up"
      aria-labelledby={`group-${group.source.replace(/\s/g, '-')}`}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-3 py-3 px-1
                   text-left hover:bg-primary-50 dark:hover:bg-primary-900
                   rounded-lg transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls={`results-${group.source.replace(/\s/g, '-')}`}
      >
        {/* Collapse icon */}
        <span className="text-primary-400 dark:text-primary-500">
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </span>

        {/* Source icon */}
        <span className="text-primary-600 dark:text-primary-400">
          <SourceIcon source={group.source} size={20} />
        </span>

        {/* Source name and count */}
        <h2
          id={`group-${group.source.replace(/\s/g, '-')}`}
          className="flex-1 font-medium text-primary-900 dark:text-primary-100"
        >
          {group.source}
        </h2>

        <span className="text-sm text-primary-400 dark:text-primary-500">
          {group.results.length} result{group.results.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Results list */}
      {!isCollapsed && (
        <div
          id={`results-${group.source.replace(/\s/g, '-')}`}
          className="mt-2 space-y-2 pl-8"
          role="list"
        >
          {group.results.map((result, idx) => {
            // Find the global index of this result
            const globalIndex = flatResults.findIndex(
              (r) =>
                r.url === result.url &&
                r.source === result.source &&
                r.title === result.title
            );

            return (
              <div key={`${result.url}-${idx}`} role="listitem">
                <ResultCard
                  result={result}
                  isSelected={globalIndex === selectedIndex}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
