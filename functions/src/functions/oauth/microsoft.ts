import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { defineString } from "firebase-functions/params";
import {
  encryptToken,
  createSignedState,
  verifySignedState,
} from "../../services/encryption";
import type { ConnectedService, Account } from "../../types";

// Configuration from Firebase environment
const microsoftClientId = defineString("MICROSOFT_CLIENT_ID");
const microsoftClientSecret = defineString("MICROSOFT_CLIENT_SECRET");
const appUrl = defineString("APP_URL");

const db = getFirestore();

// Microsoft OAuth scopes
const SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "Files.Read.All",
];

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_GRAPH_URL = "https://graph.microsoft.com/v1.0/me";

/**
 * Initiates Microsoft OAuth flow
 */
export const microsoftOAuthInitiate = onRequest(
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

      // Create signed state for CSRF protection
      const state = createSignedState(
        accountId as string,
        userId,
        (returnUrl as string) || appUrl.value()
      );

      // Get the callback URL
      const callbackUrl = `https://${req.hostname}/microsoftOAuthCallback`;

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: microsoftClientId.value(),
        response_type: "code",
        redirect_uri: callbackUrl,
        scope: SCOPES.join(" "),
        state,
        response_mode: "query",
        prompt: "consent",
      });

      const authUrl = `${MICROSOFT_AUTH_URL}?${params.toString()}`;

      res.redirect(authUrl);
    } catch (error) {
      console.error("Microsoft OAuth initiate error:", error);
      res.status(500).json({
        error: "Failed to initiate OAuth",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Handles Microsoft OAuth callback
 */
export const microsoftOAuthCallback = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        const returnUrl = appUrl.value();
        const errorMsg = error_description || error;
        res.redirect(`${returnUrl}/settings?error=${encodeURIComponent(errorMsg as string)}`);
        return;
      }

      if (!code || !state) {
        res.status(400).json({ error: "Missing code or state parameter" });
        return;
      }

      // Verify and decode state
      const stateData = verifySignedState(state as string);

      if (!stateData) {
        res.status(400).json({ error: "Invalid or expired state" });
        return;
      }

      const { accountId, returnUrl } = stateData;

      // Get the callback URL
      const callbackUrl = `https://${req.hostname}/microsoftOAuthCallback`;

      // Exchange code for tokens
      const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: microsoftClientId.value(),
          client_secret: microsoftClientSecret.value(),
          code: code as string,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Token exchange failed:", errorData);
        throw new Error("Failed to exchange code for tokens");
      }

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        throw new Error("No access token received");
      }

      // Get user info
      const userResponse = await fetch(MICROSOFT_GRAPH_URL, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      let userEmail: string | undefined;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        userEmail = userData.mail || userData.userPrincipalName;
      }

      const now = Timestamp.now();

      // Calculate token expiry
      const expiryDate = tokens.expires_in
        ? Timestamp.fromMillis(Date.now() + tokens.expires_in * 1000)
        : null;

      // Encrypt and store tokens
      const serviceData: ConnectedService = {
        status: "active",
        encryptedAccessToken: encryptToken(tokens.access_token, accountId),
        encryptedRefreshToken: tokens.refresh_token
          ? encryptToken(tokens.refresh_token, accountId)
          : "",
        tokenExpiry: expiryDate,
        metadata: {
          email: userEmail,
          scopes: SCOPES,
        },
        connectedAt: now,
        lastRefreshed: now,
      };

      // Store in Firestore
      await db
        .collection("accounts")
        .doc(accountId)
        .collection("connectedServices")
        .doc("microsoft")
        .set(serviceData);

      // Update account timestamp
      await db.collection("accounts").doc(accountId).update({
        updatedAt: now,
      });

      // Redirect back to app
      res.redirect(`${returnUrl}/settings?connected=microsoft`);
    } catch (error) {
      console.error("Microsoft OAuth callback error:", error);
      const returnUrl = appUrl.value();
      res.redirect(
        `${returnUrl}/settings?error=${encodeURIComponent("Failed to connect Microsoft account")}`
      );
    }
  }
);
