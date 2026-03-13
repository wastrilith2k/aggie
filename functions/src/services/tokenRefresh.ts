import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { google } from "googleapis";
import { encryptToken, decryptToken } from "./encryption";
import type { ConnectedService, ServiceId, DecryptedTokens } from "../types";

const googleClientId = defineString("GOOGLE_CLIENT_ID");
const googleClientSecret = defineString("GOOGLE_CLIENT_SECRET");
const microsoftClientId = defineString("MICROSOFT_CLIENT_ID");
const microsoftClientSecret = defineString("MICROSOFT_CLIENT_SECRET");

const db = getFirestore();

const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

// Refresh tokens 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Gets decrypted tokens for a service, refreshing if necessary
 */
export async function getValidTokens(
  accountId: string,
  serviceId: ServiceId
): Promise<DecryptedTokens | null> {
  const serviceDoc = await db
    .collection("accounts")
    .doc(accountId)
    .collection("connectedServices")
    .doc(serviceId)
    .get();

  if (!serviceDoc.exists) {
    return null;
  }

  const serviceData = serviceDoc.data() as ConnectedService;

  if (serviceData.status !== "active") {
    return null;
  }

  // Decrypt tokens
  const accessToken = decryptToken(serviceData.encryptedAccessToken, accountId);
  const refreshToken = serviceData.encryptedRefreshToken
    ? decryptToken(serviceData.encryptedRefreshToken, accountId)
    : "";

  // Check if token needs refresh
  const needsRefresh = serviceData.tokenExpiry
    ? Date.now() > serviceData.tokenExpiry.toMillis() - REFRESH_BUFFER_MS
    : false;

  if (needsRefresh && refreshToken) {
    // Attempt to refresh the token
    const newTokens = await refreshServiceToken(
      accountId,
      serviceId,
      refreshToken,
      serviceDoc.ref
    );

    if (newTokens) {
      return newTokens;
    }
  }

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Refreshes tokens for a specific service
 */
async function refreshServiceToken(
  accountId: string,
  serviceId: ServiceId,
  refreshToken: string,
  serviceRef: FirebaseFirestore.DocumentReference
): Promise<DecryptedTokens | null> {
  try {
    switch (serviceId) {
      case "google":
        return await refreshGoogleToken(accountId, refreshToken, serviceRef);
      case "microsoft":
        return await refreshMicrosoftToken(accountId, refreshToken, serviceRef);
      case "trello":
        // Trello tokens don't expire
        return null;
      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to refresh ${serviceId} token:`, error);

    // Mark service as expired if refresh fails
    await serviceRef.update({
      status: "expired",
      lastRefreshed: Timestamp.now(),
    });

    return null;
  }
}

/**
 * Refreshes Google OAuth token
 */
async function refreshGoogleToken(
  accountId: string,
  refreshToken: string,
  serviceRef: FirebaseFirestore.DocumentReference
): Promise<DecryptedTokens> {
  const oauth2Client = new google.auth.OAuth2(
    googleClientId.value(),
    googleClientSecret.value()
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("No access token received from refresh");
  }

  const now = Timestamp.now();

  // Update stored tokens
  await serviceRef.update({
    encryptedAccessToken: encryptToken(credentials.access_token, accountId),
    tokenExpiry: credentials.expiry_date
      ? Timestamp.fromMillis(credentials.expiry_date)
      : null,
    lastRefreshed: now,
    status: "active",
  });

  return {
    accessToken: credentials.access_token,
    refreshToken,
  };
}

/**
 * Refreshes Microsoft OAuth token
 */
async function refreshMicrosoftToken(
  accountId: string,
  refreshToken: string,
  serviceRef: FirebaseFirestore.DocumentReference
): Promise<DecryptedTokens> {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: microsoftClientId.value(),
      client_secret: microsoftClientSecret.value(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const tokens = await response.json();

  if (!tokens.access_token) {
    throw new Error("No access token received from refresh");
  }

  const now = Timestamp.now();
  const expiryDate = tokens.expires_in
    ? Timestamp.fromMillis(Date.now() + tokens.expires_in * 1000)
    : null;

  // Microsoft may return a new refresh token
  const newRefreshToken = tokens.refresh_token || refreshToken;

  // Update stored tokens
  await serviceRef.update({
    encryptedAccessToken: encryptToken(tokens.access_token, accountId),
    encryptedRefreshToken: encryptToken(newRefreshToken, accountId),
    tokenExpiry: expiryDate,
    lastRefreshed: now,
    status: "active",
  });

  return {
    accessToken: tokens.access_token,
    refreshToken: newRefreshToken,
  };
}

/**
 * Checks all accounts for tokens that need refreshing (for scheduled cleanup)
 * This could be called by a scheduled function
 */
export async function refreshExpiringTokens(): Promise<{
  refreshed: number;
  failed: number;
}> {
  const now = Date.now();
  const refreshThreshold = Timestamp.fromMillis(now + REFRESH_BUFFER_MS);

  // Find all services with tokens expiring soon
  const expiringServices = await db
    .collectionGroup("connectedServices")
    .where("status", "==", "active")
    .where("tokenExpiry", "<=", refreshThreshold)
    .get();

  let refreshed = 0;
  let failed = 0;

  for (const doc of expiringServices.docs) {
    const serviceData = doc.data() as ConnectedService;
    const serviceId = doc.id as ServiceId;

    // Get accountId from path: accounts/{accountId}/connectedServices/{serviceId}
    const accountId = doc.ref.parent.parent?.id;

    if (!accountId || !serviceData.encryptedRefreshToken) {
      continue;
    }

    try {
      const refreshToken = decryptToken(
        serviceData.encryptedRefreshToken,
        accountId
      );

      await refreshServiceToken(accountId, serviceId, refreshToken, doc.ref);
      refreshed++;
    } catch (error) {
      console.error(`Failed to refresh token for ${accountId}/${serviceId}:`, error);
      failed++;
    }
  }

  return { refreshed, failed };
}
