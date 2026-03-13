import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Account, Member, ConnectedService, ServiceId } from "../types";

const db = getFirestore();

/**
 * Creates a new account for the authenticated user
 */
export const createAccount = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in to create an account");
  }

  const { uid, token } = request.auth;
  const email = token.email;
  const name = request.data?.name || `${token.name || email}'s Account`;

  if (!email) {
    throw new HttpsError("invalid-argument", "User email is required");
  }

  // Check if user already has an account as owner
  const existingAccounts = await db
    .collection("accounts")
    .where("ownerId", "==", uid)
    .limit(1)
    .get();

  if (!existingAccounts.empty) {
    throw new HttpsError(
      "already-exists",
      "User already has an account"
    );
  }

  const now = Timestamp.now();

  // Create the account
  const accountData: Account = {
    ownerId: uid,
    ownerEmail: email,
    name,
    memberIds: [uid], // Owner is also a member
    createdAt: now,
    updatedAt: now,
  };

  const accountRef = await db.collection("accounts").add(accountData);
  const accountId = accountRef.id;

  // Add owner as a member
  const memberData: Member = {
    email,
    role: "owner",
    addedAt: now,
    addedBy: uid,
  };

  await accountRef.collection("members").doc(uid).set(memberData);

  // Update or create user document with default account
  await db.collection("users").doc(uid).set({
    email,
    displayName: token.name || email,
    photoURL: token.picture || null,
    defaultAccountId: accountId,
    createdAt: now,
    lastLogin: now,
  }, { merge: true });

  return {
    success: true,
    accountId,
    account: {
      ...accountData,
      createdAt: accountData.createdAt.toDate().toISOString(),
      updatedAt: accountData.updatedAt.toDate().toISOString(),
    },
  };
});

/**
 * Gets the current user's account
 */
export const getAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { uid } = request.auth;
  const accountId = request.data?.accountId;

  let accountRef;

  if (accountId) {
    // Get specific account
    accountRef = db.collection("accounts").doc(accountId);
  } else {
    // Get user's default account
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return { success: true, account: null };
    }

    const userData = userDoc.data();
    if (!userData?.defaultAccountId) {
      return { success: true, account: null };
    }

    accountRef = db.collection("accounts").doc(userData.defaultAccountId);
  }

  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) {
    return { success: true, account: null };
  }

  const accountData = accountDoc.data() as Account;

  // Verify user is a member
  if (!accountData.memberIds.includes(uid)) {
    throw new HttpsError("permission-denied", "Not a member of this account");
  }

  // Get members
  const membersSnapshot = await accountRef.collection("members").get();
  const members = membersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    addedAt: (doc.data() as Member).addedAt.toDate().toISOString(),
  }));

  return {
    success: true,
    account: {
      id: accountDoc.id,
      ...accountData,
      createdAt: accountData.createdAt.toDate().toISOString(),
      updatedAt: accountData.updatedAt.toDate().toISOString(),
      members,
    },
  };
});

/**
 * Gets connected services for an account
 */
export const getAccountServices = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { uid } = request.auth;
  const accountId = request.data?.accountId;

  if (!accountId) {
    throw new HttpsError("invalid-argument", "accountId is required");
  }

  // Verify membership
  const accountDoc = await db.collection("accounts").doc(accountId).get();

  if (!accountDoc.exists) {
    throw new HttpsError("not-found", "Account not found");
  }

  const accountData = accountDoc.data() as Account;

  if (!accountData.memberIds.includes(uid)) {
    throw new HttpsError("permission-denied", "Not a member of this account");
  }

  // Get connected services (without encrypted tokens)
  const servicesSnapshot = await db
    .collection("accounts")
    .doc(accountId)
    .collection("connectedServices")
    .get();

  const services = servicesSnapshot.docs.map(doc => {
    const data = doc.data() as ConnectedService;
    return {
      id: doc.id as ServiceId,
      status: data.status,
      metadata: data.metadata,
      connectedAt: data.connectedAt.toDate().toISOString(),
      lastRefreshed: data.lastRefreshed.toDate().toISOString(),
      tokenExpiry: data.tokenExpiry?.toDate().toISOString() || null,
    };
  });

  return {
    success: true,
    services,
  };
});

/**
 * Removes a member from an account (owner only)
 */
export const removeMember = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { uid } = request.auth;
  const { accountId, memberId } = request.data || {};

  if (!accountId || !memberId) {
    throw new HttpsError("invalid-argument", "accountId and memberId are required");
  }

  // Verify caller is owner
  const accountDoc = await db.collection("accounts").doc(accountId).get();

  if (!accountDoc.exists) {
    throw new HttpsError("not-found", "Account not found");
  }

  const accountData = accountDoc.data() as Account;

  if (accountData.ownerId !== uid) {
    throw new HttpsError("permission-denied", "Only the owner can remove members");
  }

  // Can't remove self (owner)
  if (memberId === uid) {
    throw new HttpsError("invalid-argument", "Cannot remove yourself as owner");
  }

  // Remove from memberIds array and delete member doc
  const batch = db.batch();

  batch.update(accountDoc.ref, {
    memberIds: FieldValue.arrayRemove(memberId),
    updatedAt: Timestamp.now(),
  });

  batch.delete(accountDoc.ref.collection("members").doc(memberId));

  await batch.commit();

  return { success: true };
});
