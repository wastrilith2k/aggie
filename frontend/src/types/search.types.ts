/** Supported data sources for search */
export type SearchSource =
  | 'Google Drive'
  | 'Trello'
  | 'Gmail'
  | 'OneDrive'
  | 'Google Calendar';

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
  source: SearchSource;
  message: string;
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
