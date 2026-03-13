import type { SearchResult, ServiceError, DecryptedTokens } from "../types";

const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

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

  if (titleLower === queryLower) score += 100;
  if (titleLower.includes(queryLower)) score += 50;
  if (titleLower.startsWith(queryLower)) score += 30;

  for (const term of queryTerms) {
    if (titleLower.includes(term)) score += 20;
  }

  if (snippetLower.includes(queryLower)) score += 15;

  for (const term of queryTerms) {
    if (snippetLower.includes(term)) score += 5;
  }

  return score;
}

interface OneDriveSearchResponse {
  value: Array<{
    id: string;
    name: string;
    webUrl: string;
    lastModifiedDateTime: string;
    file?: {
      mimeType: string;
    };
    folder?: object;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Search OneDrive files
 */
export async function searchOneDrive(
  tokens: DecryptedTokens,
  query: string
): Promise<{ results: SearchResult[]; error?: ServiceError }> {
  try {
    // Escape single quotes in query for OneDrive search
    // OneDrive uses '' to escape single quotes in search queries
    const escapedQuery = query.replace(/'/g, "''");
    const encodedQuery = encodeURIComponent(escapedQuery);

    const url = `${GRAPH_API_URL}/me/drive/root/search(q='${encodedQuery}')?$top=250&$select=id,name,webUrl,lastModifiedDateTime,file,folder`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OneDrive API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        results: [],
        error: {
          service: "onedrive",
          message: errorMessage,
          code: response.status.toString(),
        },
      };
    }

    const data: OneDriveSearchResponse = await response.json();

    if (data.error) {
      return {
        results: [],
        error: {
          service: "onedrive",
          message: data.error.message,
          code: data.error.code,
        },
      };
    }

    const files = data.value || [];

    const results: SearchResult[] = files.map(file => ({
      source: "onedrive" as const,
      title: file.name || "Untitled",
      snippet: file.file
        ? `File: ${(file.file.mimeType || "unknown").split("/").pop()}`
        : "Folder",
      url: file.webUrl || "#",
      date: file.lastModifiedDateTime || new Date().toISOString(),
      relevance: calculateRelevance(file.name || "", "", query),
      metadata: {
        fileId: file.id,
        isFolder: !!file.folder,
      },
    }));

    return { results };
  } catch (error) {
    console.error("OneDrive search error:", error);
    return {
      results: [],
      error: {
        service: "onedrive",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
