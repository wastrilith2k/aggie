/** Supported data sources for search */
export type SearchSource =
  | 'Google Drive'
  | 'Trello'
  | 'Gmail'
  | 'OneDrive'
  | 'Google Calendar';

/** Backend source identifiers (lowercase with dashes) */
export type BackendSearchSource =
  | 'google-drive'
  | 'gmail'
  | 'google-calendar'
  | 'onedrive'
  | 'trello';

/** Map backend source IDs to display names */
export const SOURCE_DISPLAY_NAMES: Record<BackendSearchSource, SearchSource> = {
  'google-drive': 'Google Drive',
  'gmail': 'Gmail',
  'google-calendar': 'Google Calendar',
  'onedrive': 'OneDrive',
  'trello': 'Trello',
};

/** Metadata specific to each source type */
export interface GoogleDriveMetadata {
  fileType?: string;
  fileId?: string;
}

export interface TrelloMetadata {
  listName?: string;
  boardName?: string;
  cardId?: string;
}

export interface GmailMetadata {
  from?: string;
  messageId?: string;
  threadId?: string;
}

export interface OneDriveMetadata {
  fileId?: string;
  isFolder?: boolean;
}

export interface GoogleCalendarMetadata {
  startTime?: string;
  endTime?: string;
  location?: string;
  eventId?: string;
}

export type SearchResultMetadata =
  | GoogleDriveMetadata
  | TrelloMetadata
  | GmailMetadata
  | OneDriveMetadata
  | GoogleCalendarMetadata;

/** Individual search result from any source */
export interface SearchResult {
  source: SearchSource;
  title: string;
  snippet: string;
  url: string;
  date: string;
  relevance: number;
  metadata: SearchResultMetadata;
}

/** Error from a specific service */
export interface ServiceError {
  service: BackendSearchSource;
  message: string;
  code?: string;
}

/** Response from the n8n search webhook */
export interface SearchResponse {
  success: boolean;
  query: string;
  totalResults: number;
  errors: ServiceError[];
  hasErrors: boolean;
  results: SearchResult[];
}

/** Search request payload */
export interface SearchRequest {
  query: string;
}

/** Grouped results by source */
export interface GroupedResults {
  source: SearchSource;
  results: SearchResult[];
  isCollapsed: boolean;
}

/** Recent search entry for localStorage */
export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
}
