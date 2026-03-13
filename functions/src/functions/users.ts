import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Account, Member, User } from "../types";

const db = getFirestore();

/**
 * Ensures a user document exists and auto-creates an account if needed
 * Call this on first login to set up the user
 */
export const ensureUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { uid, token } = request.auth;
  const email = token.email;

  if (!email) {
    throw new HttpsError("invalid-argument", "User email is required");
  }

  const now = Timestamp.now();

  // Check if user already exists
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    // Update last login
    await userRef.update({
      lastLogin: now,
      displayName: token.name || userDoc.data()?.displayName,
      photoURL: token.picture || userDoc.data()?.photoURL,
    });

    const userData = userDoc.data() as User;

    // Get the default account if it exists
    if (userData.defaultAccountId) {
      const accountDoc = await db
        .collection("accounts")
        .doc(userData.defaultAccountId)
        .get();

      if (accountDoc.exists) {
        const accountData = accountDoc.data() as Account;
        return {
          success: true,
          user: {
            ...userData,
            lastLogin: now.toDate().toISOString(),
          },
          account: {
            id: accountDoc.id,
            name: accountData.name,
            ownerId: accountData.ownerId,
            ownerEmail: accountData.ownerEmail,
          },
          isNewUser: false,
        };
      }
    }

    // User exists but no account - this shouldn't happen but handle it
    return {
      success: true,
      user: userData,
      account: null,
      isNewUser: false,
    };
  }

  // New user - create user doc and account
  const displayName = token.name || email.split("@")[0];

  // Create user document
  const newUser: User = {
    email,
    displayName,
    photoURL: token.picture || null,
    defaultAccountId: null, // Will be set after account creation
    createdAt: now,
    lastLogin: now,
  };

  await userRef.set(newUser);

  // Create default account for the user
  const accountData: Account = {
    ownerId: uid,
    ownerEmail: email,
    name: `${displayName}'s Account`,
    memberIds: [uid],
    createdAt: now,
    updatedAt: now,
  };

  const accountRef = await db.collection("accounts").add(accountData);
  const accountId = accountRef.id;

  // Add owner as member
  const memberData: Member = {
    email,
    role: "owner",
    addedAt: now,
    addedBy: uid,
  };

  await accountRef.collection("members").doc(uid).set(memberData);

  // Update user with default account
  await userRef.update({
    defaultAccountId: accountId,
  });

  return {
    success: true,
    user: {
      ...newUser,
      defaultAccountId: accountId,
      createdAt: now.toDate().toISOString(),
      lastLogin: now.toDate().toISOString(),
    },
    account: {
      id: accountId,
      name: accountData.name,
      ownerId: accountData.ownerId,
      ownerEmail: accountData.ownerEmail,
    },
    isNewUser: true,
  };
});
