import * as crypto from "crypto";
import { defineString } from "firebase-functions/params";

// Master encryption key from Firebase config (set via firebase functions:config:set)
const masterKey = defineString("ENCRYPTION_MASTER_KEY");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a per-account encryption key from the master key using HKDF
 */
function deriveAccountKey(accountId: string): Buffer {
  const masterKeyBuffer = Buffer.from(masterKey.value(), "hex");
  const salt = crypto.createHash("sha256").update(accountId).digest();

  // Use HKDF to derive a key specific to this account
  const derivedKey = crypto.hkdfSync(
    "sha256",
    masterKeyBuffer,
    salt,
    `aggie-account-${accountId}`,
    32 // 256 bits
  );

  return Buffer.from(derivedKey);
}

/**
 * Encrypts a token using AES-256-GCM with per-account derived key
 * Returns: base64(salt + iv + authTag + ciphertext)
 */
export function encryptToken(token: string, accountId: string): string {
  const key = deriveAccountKey(accountId);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine: IV + AuthTag + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypts a token using AES-256-GCM with per-account derived key
 */
export function decryptToken(encryptedData: string, accountId: string): string {
  const key = deriveAccountKey(accountId);
  const combined = Buffer.from(encryptedData, "base64");

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generates a secure random state for OAuth CSRF protection
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a signed state token that includes account and user info
 * Format: base64(JSON(state) + "." + signature)
 */
export function createSignedState(
  accountId: string,
  userId: string,
  returnUrl: string
): string {
  const state = {
    accountId,
    userId,
    returnUrl,
    nonce: generateOAuthState(),
    timestamp: Date.now(),
  };

  const stateJson = JSON.stringify(state);
  const stateBase64 = Buffer.from(stateJson).toString("base64url");

  // Sign with master key
  const signature = crypto
    .createHmac("sha256", masterKey.value())
    .update(stateBase64)
    .digest("base64url");

  return `${stateBase64}.${signature}`;
}

/**
 * Verifies and decodes a signed state token
 * Returns null if invalid or expired (15 min expiry)
 */
export function verifySignedState(signedState: string): {
  accountId: string;
  userId: string;
  returnUrl: string;
} | null {
  try {
    const [stateBase64, signature] = signedState.split(".");

    if (!stateBase64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", masterKey.value())
      .update(stateBase64)
      .digest("base64url");

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      return null;
    }

    // Decode state
    const stateJson = Buffer.from(stateBase64, "base64url").toString("utf8");
    const state = JSON.parse(stateJson);

    // Check expiry (15 minutes)
    const maxAge = 15 * 60 * 1000;
    if (Date.now() - state.timestamp > maxAge) {
      return null;
    }

    return {
      accountId: state.accountId,
      userId: state.userId,
      returnUrl: state.returnUrl,
    };
  } catch {
    return null;
  }
}
