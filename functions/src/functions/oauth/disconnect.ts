import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Account, ServiceId } from "../../types";

const db = getFirestore();

/**
 * Disconnects a service from an account
 * Only the account owner can disconnect services
 */
export const disconnectService = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { uid } = request.auth;
  const { accountId, serviceId } = request.data || {};

  if (!accountId || !serviceId) {
    throw new HttpsError(
      "invalid-argument",
      "accountId and serviceId are required"
    );
  }

  // Validate serviceId
  const validServices: ServiceId[] = ["google", "microsoft", "trello"];
  if (!validServices.includes(serviceId)) {
    throw new HttpsError("invalid-argument", "Invalid service ID");
  }

  // Verify user is the account owner
  const accountDoc = await db.collection("accounts").doc(accountId).get();

  if (!accountDoc.exists) {
    throw new HttpsError("not-found", "Account not found");
  }

  const accountData = accountDoc.data() as Account;

  if (accountData.ownerId !== uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the account owner can disconnect services"
    );
  }

  // Check if service is connected
  const serviceDoc = await db
    .collection("accounts")
    .doc(accountId)
    .collection("connectedServices")
    .doc(serviceId)
    .get();

  if (!serviceDoc.exists) {
    throw new HttpsError("not-found", "Service is not connected");
  }

  // Delete the service connection
  await serviceDoc.ref.delete();

  // Update account timestamp
  await db.collection("accounts").doc(accountId).update({
    updatedAt: Timestamp.now(),
  });

  return {
    success: true,
    message: `${serviceId} disconnected successfully`,
  };
});
