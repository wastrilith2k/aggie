import { defineString } from "firebase-functions/params";
import type { SearchResult, ServiceError, DecryptedTokens } from "../types";

const trelloApiKey = defineString("TRELLO_API_KEY");

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

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  shortUrl?: string;
  dateLastActivity: string;
  idList: string;
  idBoard: string;
  list?: {
    name: string;
  };
  board?: {
    name: string;
  };
}

interface TrelloSearchResponse {
  cards: TrelloCard[];
  error?: string;
}

/**
 * Search Trello cards
 */
export async function searchTrello(
  tokens: DecryptedTokens,
  query: string
): Promise<{ results: SearchResult[]; error?: ServiceError }> {
  try {
    const apiKey = trelloApiKey.value();
    // For Trello, accessToken is the oauth_token
    const token = tokens.accessToken;

    const params = new URLSearchParams({
      query,
      key: apiKey,
      token,
      modelTypes: "cards",
      cards_limit: "99",
      card_fields: "name,desc,url,dateLastActivity,idList,idBoard",
      card_list: "true",
      card_board: "true",
    });

    const response = await fetch(
      `https://api.trello.com/1/search?${params.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        results: [],
        error: {
          service: "trello",
          message: `Trello API error: ${response.status} - ${errorText}`,
          code: response.status.toString(),
        },
      };
    }

    const data: TrelloSearchResponse = await response.json();

    if (data.error) {
      return {
        results: [],
        error: {
          service: "trello",
          message: typeof data.error === "string" ? data.error : JSON.stringify(data.error),
        },
      };
    }

    const cards = data.cards || [];

    const results: SearchResult[] = cards.map(card => ({
      source: "trello" as const,
      title: card.name || "Untitled Card",
      snippet: card.desc ? card.desc.substring(0, 200) : "No description",
      url: card.url || card.shortUrl || "#",
      date: card.dateLastActivity || new Date().toISOString(),
      relevance: calculateRelevance(card.name || "", card.desc || "", query),
      metadata: {
        listName: card.list?.name,
        boardName: card.board?.name,
        cardId: card.id,
      },
    }));

    return { results };
  } catch (error) {
    console.error("Trello search error:", error);
    return {
      results: [],
      error: {
        service: "trello",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
