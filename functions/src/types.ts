import { Timestamp } from "firebase-admin/firestore";

// Service identifiers
export type ServiceId = "google" | "microsoft" | "trello";

// Account document
export interface Account {
  ownerId: string;
  ownerEmail: string;
  name: string;
  memberIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Connected service document
export interface ConnectedService {
  status: "active" | "expired" | "revoked";
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiry: Timestamp | null;
  metadata: {
    email?: string;
    scopes?: string[];
  };
  connectedAt: Timestamp;
  lastRefreshed: Timestamp;
}

// Member document
export interface Member {
  email: string;
  role: "owner" | "member";
  addedAt: Timestamp;
  addedBy: string;
}

// User document
export interface User {
  email: string;
  displayName: string;
  photoURL: string | null;
  defaultAccountId: string | null;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

// Invitation document
export interface Invitation {
  accountId: string;
  accountName: string;
  inviterEmail: string;
  inviteeEmail: string;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

// Search types
export type SearchSource = "google-drive" | "gmail" | "google-calendar" | "onedrive" | "trello";

export interface SearchResultMetadata {
  // Google Drive
  fileType?: string;
  fileId?: string;
  // Trello
  listName?: string;
  boardName?: string;
  cardId?: string;
  // Gmail
  from?: string;
  messageId?: string;
  threadId?: string;
  // OneDrive
  isFolder?: boolean;
  // Google Calendar
  startTime?: string;
  endTime?: string;
  location?: string;
  eventId?: string;
}

export interface SearchResult {
  source: SearchSource;
  title: string;
  snippet: string;
  url: string;
  date: string;
  relevance: number;
  metadata: SearchResultMetadata;
}

export interface ServiceError {
  service: SearchSource;
  message: string;
  code?: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  totalResults: number;
  errors: ServiceError[];
  hasErrors: boolean;
  results: SearchResult[];
}

// Decrypted tokens for internal use
export interface DecryptedTokens {
  accessToken: string;
  refreshToken: string;
}

// OAuth state for CSRF protection
export interface OAuthState {
  accountId: string;
  userId: string;
  returnUrl: string;
  nonce: string;
}
