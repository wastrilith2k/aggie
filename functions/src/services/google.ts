import { google } from "googleapis";
import type { SearchResult, ServiceError, DecryptedTokens } from "../types";

/**
 * Creates authenticated Google API clients
 */
function createClients(tokens: DecryptedTokens) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return {
    drive: google.drive({ version: "v3", auth }),
    gmail: google.gmail({ version: "v1", auth }),
    calendar: google.calendar({ version: "v3", auth }),
  };
}

/**
 * Calculate relevance score for search result
 */
function calculateRelevance(title: string, snippet: string, query: string): number {
  if (!query) return 0;

  const titleLower = (title || "").toLowerCase();
  const snippetLower = (snippet || "").toLowerCase();
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);

  let score = 0;

  // Exact title match
  if (titleLower === queryLower) score += 100;

  // Title contains exact query
  if (titleLower.includes(queryLower)) score += 50;

  // Title starts with query
  if (titleLower.startsWith(queryLower)) score += 30;

  // Count term matches in title (higher weight)
  for (const term of queryTerms) {
    if (titleLower.includes(term)) score += 20;
  }

  // Snippet contains exact query
  if (snippetLower.includes(queryLower)) score += 15;

  // Count term matches in snippet
  for (const term of queryTerms) {
    if (snippetLower.includes(term)) score += 5;
  }

  return score;
}

/**
 * Search Google Drive
 */
export async function searchGoogleDrive(
  tokens: DecryptedTokens,
  query: string
): Promise<{ results: SearchResult[]; error?: ServiceError }> {
  try {
    const { drive } = createClients(tokens);

    // Escape single quotes in query for Drive API
    const escapedQuery = query.replace(/'/g, "\\'");

    const response = await drive.files.list({
      q: `fullText contains '${escapedQuery}' and trashed = false`,
      pageSize: 250,
      fields: "files(id,name,mimeType,webViewLink,modifiedTime,description)",
    });

    const files = response.data.files || [];

    const results: SearchResult[] = files.map(file => ({
      source: "google-drive" as const,
      title: file.name || "Untitled",
      snippet: file.description || `${(file.mimeType || "file").split("/").pop()}`,
      url: file.webViewLink || `https://drive.google.com/file/d/${file.id}`,
      date: file.modifiedTime || new Date().toISOString(),
      relevance: calculateRelevance(file.name || "", file.description || "", query),
      metadata: {
        fileType: file.mimeType || undefined,
        fileId: file.id || undefined,
      },
    }));

    return { results };
  } catch (error) {
    console.error("Google Drive search error:", error);
    return {
      results: [],
      error: {
        service: "google-drive",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Search Gmail
 */
export async function searchGmail(
  tokens: DecryptedTokens,
  query: string
): Promise<{ results: SearchResult[]; error?: ServiceError }> {
  try {
    const { gmail } = createClients(tokens);

    // Search for messages
    const searchResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50,
    });

    const messages = searchResponse.data.messages || [];

    if (messages.length === 0) {
      return { results: [] };
    }

    // Get full details for each message
    const results: SearchResult[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
          fields: "id,threadId,labelIds,snippet,internalDate,payload(headers,mimeType)",
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name: string): string => {
          const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
          return header?.value || "";
        };

        const snippet = detail.data.snippet || "";
        let subject = getHeader("Subject");
        if (!subject && snippet) {
          subject = snippet.substring(0, 50) + (snippet.length > 50 ? "..." : "");
        }
        subject = subject || "(No Subject)";

        const from = getHeader("From") || "Unknown";

        let date: string;
        try {
          const dateStr = getHeader("Date");
          if (dateStr) {
            date = new Date(dateStr).toISOString();
          } else if (detail.data.internalDate) {
            date = new Date(parseInt(detail.data.internalDate)).toISOString();
          } else {
            date = new Date().toISOString();
          }
        } catch {
          date = new Date().toISOString();
        }

        results.push({
          source: "gmail" as const,
          title: subject,
          snippet: snippet || "No preview available",
          url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
          date,
          relevance: calculateRelevance(subject, snippet, query),
          metadata: {
            from,
            messageId: msg.id,
            threadId: msg.threadId || undefined,
          },
        });
      } catch (e) {
        // Continue with other messages if one fails
        console.warn(`Failed to get message ${msg.id}:`, e);
      }
    }

    return { results };
  } catch (error) {
    console.error("Gmail search error:", error);
    return {
      results: [],
      error: {
        service: "gmail",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Search Google Calendar (across all calendars)
 */
export async function searchGoogleCalendar(
  tokens: DecryptedTokens,
  query: string
): Promise<{ results: SearchResult[]; error?: ServiceError }> {
  try {
    const { calendar } = createClients(tokens);

    // Get list of calendars
    const calendarListResponse = await calendar.calendarList.list();
    const calendars = calendarListResponse.data.items || [];

    if (calendars.length === 0) {
      return { results: [] };
    }

    // Search each calendar
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneYearAhead = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const results: SearchResult[] = [];

    for (const cal of calendars) {
      if (!cal.id) continue;

      try {
        const eventsResponse = await calendar.events.list({
          calendarId: cal.id,
          q: query,
          maxResults: 50,
          timeMin: oneYearAgo.toISOString(),
          timeMax: oneYearAhead.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
        });

        const events = eventsResponse.data.items || [];

        for (const event of events) {
          const startTime = event.start?.dateTime || event.start?.date;
          const endTime = event.end?.dateTime || event.end?.date;

          let snippetText = "";
          if (event.description) {
            snippetText = event.description.substring(0, 200);
          } else if (startTime) {
            try {
              snippetText = new Date(startTime).toLocaleString();
            } catch {
              snippetText = startTime;
            }
          } else {
            snippetText = "No time set";
          }

          results.push({
            source: "google-calendar" as const,
            title: event.summary || "(No Title)",
            snippet: snippetText,
            url: event.htmlLink || "#",
            date: startTime || event.created || new Date().toISOString(),
            relevance: calculateRelevance(event.summary || "", event.description || "", query),
            metadata: {
              startTime: startTime || undefined,
              endTime: endTime || undefined,
              location: event.location || undefined,
              eventId: event.id || undefined,
            },
          });
        }
      } catch (e) {
        // Continue with other calendars if one fails
        console.warn(`Failed to search calendar ${cal.id}:`, e);
      }
    }

    return { results };
  } catch (error) {
    console.error("Google Calendar search error:", error);
    return {
      results: [],
      error: {
        service: "google-calendar",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
