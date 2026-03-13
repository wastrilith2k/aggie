import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Account, Invitation, Member } from "../types";

const db = getFirestore();

// Invitation expiry time (7 days)
const INVITATION_EXPIRY_DAYS = 7;

interface SendInvitationRequest {
  accountId: string;
  inviteeEmail: string;
}

/**
 * Send an invitation to join an account
 * Only the account owner can send invitations
 */
export const sendInvitation = onCall<SendInvitationRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { uid, token } = request.auth;
  const { accountId, inviteeEmail } = request.data || {};

  if (!accountId || !inviteeEmail) {
    throw new HttpsError(
      "invalid-argument",
      "accountId and inviteeEmail are required"
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(inviteeEmail)) {
    throw new HttpsError("invalid-argument", "Invalid email format");
  }

  // Verify caller is the account owner
  const accountDoc = await db.collection("accounts").doc(accountId).get();

  if (!accountDoc.exists) {
    throw new HttpsError("not-found", "Account not found");
  }

  const accountData = accountDoc.data() as Account;

  if (accountData.ownerId !== uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the account owner can send invitations"
    );
  }

  // Check if invitee is already a member
  const membersSnapshot = await db
    .collection("accounts")
    .doc(accountId)
    .collection("members")
    .where("email", "==", inviteeEmail)
    .limit(1)
    .get();

  if (!membersSnapshot.empty) {
    throw new HttpsError(
      "already-exists",
      "User is already a member of this account"
    );
  }

  // Check if there's already a pending invitation
  const existingInvitations = await db
    .collection("invitations")
    .where("accountId", "==", accountId)
    .where("inviteeEmail", "==", inviteeEmail)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existingInvitations.empty) {
    throw new HttpsError(
      "already-exists",
      "An invitation is already pending for this email"
    );
  }

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Create invitation
  const invitation: Invitation = {
    accountId,
    accountName: accountData.name,
    inviterEmail: token.email || "Unknown",
    inviteeEmail,
    status: "pending",
    createdAt: now,
    expiresAt,
  };

  const invitationRef = await db.collection("invitations").add(invitation);

  return {
    success: true,
    invitationId: invitationRef.id,
    invitation: {
      ...invitation,
      createdAt: invitation.createdAt.toDate().toISOString(),
      expiresAt: invitation.expiresAt.toDate().toISOString(),
    },
  };
});

interface AcceptInvitationRequest {
  invitationId: string;
}

/**
 * Accept an invitation to join an account
 */
export const acceptInvitation = onCall<AcceptInvitationRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { uid, token } = request.auth;
  const { invitationId } = request.data || {};

  if (!invitationId) {
    throw new HttpsError("invalid-argument", "invitationId is required");
  }

  const invitationRef = db.collection("invitations").doc(invitationId);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new HttpsError("not-found", "Invitation not found");
  }

  const invitation = invitationDoc.data() as Invitation;

  // Verify the invitation is for this user
  if (invitation.inviteeEmail !== token.email) {
    throw new HttpsError(
      "permission-denied",
      "This invitation is for a different email address"
    );
  }

  // Check if invitation is still pending
  if (invitation.status !== "pending") {
    throw new HttpsError(
      "failed-precondition",
      `Invitation has already been ${invitation.status}`
    );
  }

  // Check if invitation has expired
  if (invitation.expiresAt.toMillis() < Date.now()) {
    await invitationRef.update({ status: "expired" });
    throw new HttpsError("failed-precondition", "Invitation has expired");
  }

  // Get the account
  const accountRef = db.collection("accounts").doc(invitation.accountId);
  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) {
    throw new HttpsError("not-found", "Account no longer exists");
  }

  const now = Timestamp.now();

  // Use a batch to update everything atomically
  const batch = db.batch();

  // Update invitation status
  batch.update(invitationRef, {
    status: "accepted",
  });

  // Add user to account's memberIds
  batch.update(accountRef, {
    memberIds: FieldValue.arrayUnion(uid),
    updatedAt: now,
  });

  // Add member document
  const memberData: Member = {
    email: token.email || invitation.inviteeEmail,
    role: "member",
    addedAt: now,
    addedBy: invitation.inviterEmail,
  };

  batch.set(
    accountRef.collection("members").doc(uid),
    memberData
  );

  // Update user's default account if they don't have one
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const userData = userDoc.data();
    if (!userData?.defaultAccountId) {
      batch.update(userRef, { defaultAccountId: invitation.accountId });
    }
  } else {
    // Create user document
    batch.set(userRef, {
      email: token.email,
      displayName: token.name || token.email?.split("@")[0] || "User",
      photoURL: token.picture || null,
      defaultAccountId: invitation.accountId,
      createdAt: now,
      lastLogin: now,
    });
  }

  await batch.commit();

  return {
    success: true,
    accountId: invitation.accountId,
    accountName: invitation.accountName,
  };
});

interface DeclineInvitationRequest {
  invitationId: string;
}

/**
 * Decline an invitation
 */
export const declineInvitation = onCall<DeclineInvitationRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { token } = request.auth;
  const { invitationId } = request.data || {};

  if (!invitationId) {
    throw new HttpsError("invalid-argument", "invitationId is required");
  }

  const invitationRef = db.collection("invitations").doc(invitationId);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new HttpsError("not-found", "Invitation not found");
  }

  const invitation = invitationDoc.data() as Invitation;

  // Verify the invitation is for this user
  if (invitation.inviteeEmail !== token.email) {
    throw new HttpsError(
      "permission-denied",
      "This invitation is for a different email address"
    );
  }

  if (invitation.status !== "pending") {
    throw new HttpsError(
      "failed-precondition",
      `Invitation has already been ${invitation.status}`
    );
  }

  await invitationRef.update({ status: "declined" });

  return { success: true };
});

/**
 * Get pending invitations for the current user
 */
export const getInvitations = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { token } = request.auth;

  if (!token.email) {
    throw new HttpsError("invalid-argument", "User email not available");
  }

  // Get pending invitations for this email
  const invitationsSnapshot = await db
    .collection("invitations")
    .where("inviteeEmail", "==", token.email)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .get();

  const invitations = invitationsSnapshot.docs.map(doc => {
    const data = doc.data() as Invitation;
    return {
      id: doc.id,
      accountId: data.accountId,
      accountName: data.accountName,
      inviterEmail: data.inviterEmail,
      status: data.status,
      createdAt: data.createdAt.toDate().toISOString(),
      expiresAt: data.expiresAt.toDate().toISOString(),
    };
  });

  // Filter out expired invitations
  const now = Date.now();
  const validInvitations = invitations.filter(inv =>
    new Date(inv.expiresAt).getTime() > now
  );

  return {
    success: true,
    invitations: validInvitations,
  };
});
