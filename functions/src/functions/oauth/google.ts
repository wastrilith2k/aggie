import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { defineString } from "firebase-functions/params";
import { google } from "googleapis";
import {
  encryptToken,
  createSignedState,
  verifySignedState,
} from "../../services/encryption";
import type { ConnectedService, Account } from "../../types";

// Configuration from Firebase environment
const googleClientId = defineString("GOOGLE_CLIENT_ID");
const googleClientSecret = defineString("GOOGLE_CLIENT_SECRET");
const appUrl = defineString("APP_URL");

const db = getFirestore();

// Google OAuth scopes for search
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Creates OAuth2 client with proper redirect URI
 */
function getOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    googleClientId.value(),
    googleClientSecret.value(),
    redirectUri
  );
}

/**
 * Initiates Google OAuth flow
 * Query params: accountId, idToken (Firebase ID token), returnUrl
 */
export const googleOAuthInitiate = onRequest(
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
      const callbackUrl = `https://${req.hostname}/googleOAuthCallback`;

      const oauth2Client = getOAuth2Client(callbackUrl);

      // Generate authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        state,
        prompt: "consent", // Force consent to get refresh token
        include_granted_scopes: true,
      });

      res.redirect(authUrl);
    } catch (error) {
      console.error("Google OAuth initiate error:", error);
      res.status(500).json({
        error: "Failed to initiate OAuth",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Handles Google OAuth callback
 * Stores encrypted tokens in Firestore
 */
export const googleOAuthCallback = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { code, state, error } = req.query;

      // Handle OAuth errors
      if (error) {
        const returnUrl = appUrl.value();
        res.redirect(`${returnUrl}/settings?error=${encodeURIComponent(error as string)}`);
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

      // Exchange code for tokens
      const callbackUrl = `https://${req.hostname}/googleOAuthCallback`;
      const oauth2Client = getOAuth2Client(callbackUrl);

      const { tokens } = await oauth2Client.getToken(code as string);

      if (!tokens.access_token) {
        throw new Error("No access token received");
      }

      // Get user info to store email
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      const now = Timestamp.now();

      // Encrypt and store tokens
      const serviceData: ConnectedService = {
        status: "active",
        encryptedAccessToken: encryptToken(tokens.access_token, accountId),
        encryptedRefreshToken: tokens.refresh_token
          ? encryptToken(tokens.refresh_token, accountId)
          : "",
        tokenExpiry: tokens.expiry_date
          ? Timestamp.fromMillis(tokens.expiry_date)
          : null,
        metadata: {
          email: userInfo.data.email || undefined,
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
        .doc("google")
        .set(serviceData);

      // Update account timestamp
      await db.collection("accounts").doc(accountId).update({
        updatedAt: now,
      });

      // Redirect back to app
      res.redirect(`${returnUrl}/settings?connected=google`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      const returnUrl = appUrl.value();
      res.redirect(
        `${returnUrl}/settings?error=${encodeURIComponent("Failed to connect Google account")}`
      );
    }
  }
);
