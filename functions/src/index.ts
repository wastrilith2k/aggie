import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Export OAuth functions
export { googleOAuthInitiate, googleOAuthCallback } from "./functions/oauth/google";
export { microsoftOAuthInitiate, microsoftOAuthCallback } from "./functions/oauth/microsoft";
export { trelloOAuthInitiate, trelloOAuthCallback } from "./functions/oauth/trello";
export { disconnectService } from "./functions/oauth/disconnect";

// Export account functions
export { createAccount, getAccount, getAccountServices, removeMember } from "./functions/accounts";

// Export invitation functions
export { sendInvitation, acceptInvitation, declineInvitation, getInvitations } from "./functions/invitations";

// Export search function
export { search } from "./functions/search";

// Export user functions
export { ensureUser } from "./functions/users";
