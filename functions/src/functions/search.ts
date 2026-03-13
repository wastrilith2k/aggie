import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getValidTokens } from "../services/tokenRefresh";
import { searchGoogleDrive, searchGmail, searchGoogleCalendar } from "../services/google";
import { searchOneDrive } from "../services/microsoft";
import { searchTrello } from "../services/trello";
import type {
  Account,
  ConnectedService,
  SearchResult,
  ServiceError,
  SearchResponse,
  ServiceId,
} from "../types";

const db = getFirestore();

interface SearchRequest {
  query: string;
  accountId: string;
}

/**
 * Main search function
 * Searches all connected services for the given account
 */
export const search = onCall<SearchRequest>(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in to search");
  }

  const { uid } = request.auth;
  const { query, accountId } = request.data || {};

  // Validate input
  if (!query || typeof query !== "string") {
    throw new HttpsError("invalid-argument", "Query is required");
  }

  if (!accountId || typeof accountId !== "string") {
    throw new HttpsError("invalid-argument", "accountId is required");
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new HttpsError("invalid-argument", "Query cannot be empty");
  }

  // Verify user is a member of the account
  const accountDoc = await db.collection("accounts").doc(accountId).get();

  if (!accountDoc.exists) {
    throw new HttpsError("not-found", "Account not found");
  }

  const accountData = accountDoc.data() as Account;

  if (!accountData.memberIds.includes(uid)) {
    throw new HttpsError("permission-denied", "Not a member of this account");
  }

  // Get connected services for the account
  const servicesSnapshot = await db
    .collection("accounts")
    .doc(accountId)
    .collection("connectedServices")
    .where("status", "==", "active")
    .get();

  if (servicesSnapshot.empty) {
    return {
      success: true,
      query: trimmedQuery,
      totalResults: 0,
      errors: [],
      hasErrors: false,
      results: [],
      message: "No services connected. Connect services in Settings.",
    } as SearchResponse & { message: string };
  }

  // Build map of connected services
  const connectedServices = new Map<ServiceId, ConnectedService>();
  for (const doc of servicesSnapshot.docs) {
    connectedServices.set(doc.id as ServiceId, doc.data() as ConnectedService);
  }

  // Execute searches in parallel
  const searchPromises: Promise<{
    results: SearchResult[];
    error?: ServiceError;
  }>[] = [];

  // Google services (Drive, Gmail, Calendar)
  if (connectedServices.has("google")) {
    const googleTokens = await getValidTokens(accountId, "google");
    if (googleTokens) {
      searchPromises.push(searchGoogleDrive(googleTokens, trimmedQuery));
      searchPromises.push(searchGmail(googleTokens, trimmedQuery));
      searchPromises.push(searchGoogleCalendar(googleTokens, trimmedQuery));
    } else {
      searchPromises.push(Promise.resolve({
        results: [],
        error: {
          service: "google-drive" as const,
          message: "Google tokens expired or invalid",
        },
      }));
    }
  }

  // Microsoft OneDrive
  if (connectedServices.has("microsoft")) {
    const microsoftTokens = await getValidTokens(accountId, "microsoft");
    if (microsoftTokens) {
      searchPromises.push(searchOneDrive(microsoftTokens, trimmedQuery));
    } else {
      searchPromises.push(Promise.resolve({
        results: [],
        error: {
          service: "onedrive" as const,
          message: "Microsoft tokens expired or invalid",
        },
      }));
    }
  }

  // Trello
  if (connectedServices.has("trello")) {
    const trelloTokens = await getValidTokens(accountId, "trello");
    if (trelloTokens) {
      searchPromises.push(searchTrello(trelloTokens, trimmedQuery));
    } else {
      searchPromises.push(Promise.resolve({
        results: [],
        error: {
          service: "trello" as const,
          message: "Trello tokens expired or invalid",
        },
      }));
    }
  }

  // Wait for all searches to complete
  const searchResults = await Promise.all(searchPromises);

  // Aggregate results and errors
  const allResults: SearchResult[] = [];
  const allErrors: ServiceError[] = [];

  for (const result of searchResults) {
    if (result.results.length > 0) {
      allResults.push(...result.results);
    }
    if (result.error) {
      allErrors.push(result.error);
    }
  }

  // Sort by relevance (descending), then by date (newest first)
  allResults.sort((a, b) => {
    if (b.relevance !== a.relevance) {
      return b.relevance - a.relevance;
    }
    try {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } catch {
      return 0;
    }
  });

  const response: SearchResponse = {
    success: true,
    query: trimmedQuery,
    totalResults: allResults.length,
    errors: allErrors,
    hasErrors: allErrors.length > 0,
    results: allResults,
  };

  return response;
});
