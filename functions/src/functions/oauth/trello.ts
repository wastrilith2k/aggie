import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { defineString } from "firebase-functions/params";
import * as crypto from "crypto";
import {
  encryptToken,
  createSignedState,
  verifySignedState,
} from "../../services/encryption";
import type { ConnectedService, Account } from "../../types";

// Configuration from Firebase environment
const trelloApiKey = defineString("TRELLO_API_KEY");
const trelloApiSecret = defineString("TRELLO_API_SECRET");
const appUrl = defineString("APP_URL");

const db = getFirestore();

const TRELLO_REQUEST_TOKEN_URL = "https://trello.com/1/OAuthGetRequestToken";
const TRELLO_AUTHORIZE_URL = "https://trello.com/1/OAuthAuthorizeToken";
const TRELLO_ACCESS_TOKEN_URL = "https://trello.com/1/OAuthGetAccessToken";

// Temporary storage for OAuth 1.0a request tokens (needed between initiate and callback)
// In production, you might want to use Redis or Firestore for this
const requestTokenStore = new Map<string, { token: string; tokenSecret: string }>();

/**
 * Generates OAuth 1.0a signature
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret = ""
): string {
  // Sort and encode parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate HMAC-SHA1 signature
  return crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");
}

/**
 * Makes OAuth 1.0a request
 */
async function makeOAuthRequest(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  tokenSecret = ""
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const allParams: Record<string, string> = {
    oauth_consumer_key: trelloApiKey.value(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
    ...oauthParams,
  };

  // Generate signature
  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    trelloApiSecret.value(),
    tokenSecret
  );

  allParams.oauth_signature = signature;

  // Build Authorization header
  const authHeader = "OAuth " + Object.keys(allParams)
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(allParams[key])}"`)
    .join(", ");

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth request failed: ${response.status} - ${error}`);
  }

  return response.text();
}

/**
 * Initiates Trello OAuth flow
 */
export const trelloOAuthInitiate = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { accountId, idToken, returnUrl } = req.query;

      if (!accountId || !idToken) {
        res.status(400).json({
          error: "Missing required parameters: accountId, idToken",
        });
        return;
      }

      // Verify Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(idToken as string);
      const userId = decodedToken.uid;

      // Verify user is a member of the account
      const accountDoc = await db.collection("accounts").doc(accountId as string).get();

      if (!accountDoc.exists) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      const accountData = accountDoc.data() as Account;

      if (!accountData.memberIds.includes(userId)) {
        res.status(403).json({ error: "Not a member of this account" });
        return;
      }

      // Get the callback URL
      const callbackUrl = `https://${req.hostname}/trelloOAuthCallback`;

      // Step 1: Get request token
      const requestTokenResponse = await makeOAuthRequest(
        "POST",
        TRELLO_REQUEST_TOKEN_URL,
        { oauth_callback: callbackUrl }
      );

      // Parse response
      const requestTokenParams = new URLSearchParams(requestTokenResponse);
      const requestToken = requestTokenParams.get("oauth_token");
      const requestTokenSecret = requestTokenParams.get("oauth_token_secret");

      if (!requestToken || !requestTokenSecret) {
        throw new Error("Failed to get request token");
      }

      // Create signed state for CSRF protection
      const state = createSignedState(
        accountId as string,
        userId,
        (returnUrl as string) || appUrl.value()
      );

      // Store request token secret temporarily (needed for callback)
      // Key it by the state for security
      requestTokenStore.set(state, {
        token: requestToken,
        tokenSecret: requestTokenSecret,
      });

      // Clean up old entries after 15 minutes
      setTimeout(() => {
        requestTokenStore.delete(state);
      }, 15 * 60 * 1000);

      // Step 2: Redirect to Trello authorization
      const authParams = new URLSearchParams({
        oauth_token: requestToken,
        name: "Aggie Search",
        scope: "read",
        expiration: "never",
        return_url: `${callbackUrl}?state=${encodeURIComponent(state)}`,
      });

      const authUrl = `${TRELLO_AUTHORIZE_URL}?${authParams.toString()}`;

      res.redirect(authUrl);
    } catch (error) {
      console.error("Trello OAuth initiate error:", error);
      res.status(500).json({
        error: "Failed to initiate OAuth",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Handles Trello OAuth callback
 */
export const trelloOAuthCallback = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { oauth_token, oauth_verifier, state } = req.query;

      if (!oauth_token || !oauth_verifier || !state) {
        res.status(400).json({
          error: "Missing required parameters",
        });
        return;
      }

      // Verify and decode state
      const stateData = verifySignedState(state as string);

      if (!stateData) {
        res.status(400).json({ error: "Invalid or expired state" });
        return;
      }

      const { accountId, returnUrl } = stateData;

      // Get stored request token secret
      const storedTokenData = requestTokenStore.get(state as string);

      if (!storedTokenData) {
        res.status(400).json({ error: "Request token expired" });
        return;
      }

      // Clean up
      requestTokenStore.delete(state as string);

      // Step 3: Exchange for access token
      const accessTokenResponse = await makeOAuthRequest(
        "POST",
        TRELLO_ACCESS_TOKEN_URL,
        {
          oauth_token: oauth_token as string,
          oauth_verifier: oauth_verifier as string,
        },
        storedTokenData.tokenSecret
      );

      // Parse response
      const accessTokenParams = new URLSearchParams(accessTokenResponse);
      const accessToken = accessTokenParams.get("oauth_token");
      const accessTokenSecret = accessTokenParams.get("oauth_token_secret");

      if (!accessToken || !accessTokenSecret) {
        throw new Error("Failed to get access token");
      }

      // Get user info from Trello
      const memberResponse = await fetch(
        `https://api.trello.com/1/members/me?key=${trelloApiKey.value()}&token=${accessToken}`
      );

      let userEmail: string | undefined;
      if (memberResponse.ok) {
        const memberData = await memberResponse.json();
        userEmail = memberData.email;
      }

      const now = Timestamp.now();

      // Encrypt and store tokens
      // Trello tokens don't expire, so we store both oauth_token and oauth_token_secret
      const serviceData: ConnectedService = {
        status: "active",
        encryptedAccessToken: encryptToken(accessToken, accountId),
        encryptedRefreshToken: encryptToken(accessTokenSecret, accountId), // Store token secret as "refresh" token
        tokenExpiry: null, // Trello tokens don't expire
        metadata: {
          email: userEmail,
          scopes: ["read"],
        },
        connectedAt: now,
        lastRefreshed: now,
      };

      // Store in Firestore
      await db
        .collection("accounts")
        .doc(accountId)
        .collection("connectedServices")
        .doc("trello")
        .set(serviceData);

      // Update account timestamp
      await db.collection("accounts").doc(accountId).update({
        updatedAt: now,
      });

      // Redirect back to app
      res.redirect(`${returnUrl}/settings?connected=trello`);
    } catch (error) {
      console.error("Trello OAuth callback error:", error);
      const returnUrl = appUrl.value();
      res.redirect(
        `${returnUrl}/settings?error=${encodeURIComponent("Failed to connect Trello account")}`
      );
    }
  }
);
