import { useState, useCallback, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { useAuth } from '../firebase/AuthContext';
import { useAccount } from '../contexts/AccountContext';

export interface Invitation {
  id: string;
  accountId: string;
  accountName: string;
  inviterEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

interface UseInvitationsReturn {
  pendingInvitations: Invitation[];
  loading: boolean;
  error: string | null;
  sendInvitation: (email: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  refreshInvitations: () => Promise<void>;
}

export function useInvitations(): UseInvitationsReturn {
  const { user, isAuthorized } = useAuth();
  const { account, refreshAccount } = useAccount();
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending invitations for current user
  const refreshInvitations = useCallback(async () => {
    if (!user || !isAuthorized) {
      setPendingInvitations([]);
      return;
    }

    setLoading(true);
    try {
      const getInvitationsFn = httpsCallable<
        void,
        { success: boolean; invitations: Invitation[] }
      >(functions, 'getInvitations');

      const result = await getInvitationsFn();

      if (result.data.success) {
        setPendingInvitations(result.data.invitations);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [user, isAuthorized]);

  // Send an invitation (owner only)
  const sendInvitation = useCallback(async (email: string) => {
    if (!account) {
      throw new Error('No account available');
    }

    setError(null);

    try {
      const sendInvitationFn = httpsCallable<
        { accountId: string; inviteeEmail: string },
        { success: boolean; invitationId: string }
      >(functions, 'sendInvitation');

      await sendInvitationFn({
        accountId: account.id,
        inviteeEmail: email,
      });

      // Refresh account to show updated member list
      await refreshAccount();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(message);
      throw new Error(message);
    }
  }, [account, refreshAccount]);

  // Accept an invitation
  const acceptInvitation = useCallback(async (invitationId: string) => {
    setError(null);

    try {
      const acceptInvitationFn = httpsCallable<
        { invitationId: string },
        { success: boolean; accountId: string; accountName: string }
      >(functions, 'acceptInvitation');

      await acceptInvitationFn({ invitationId });

      // Refresh everything
      await refreshInvitations();
      await refreshAccount();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      setError(message);
      throw new Error(message);
    }
  }, [refreshInvitations, refreshAccount]);

  // Decline an invitation
  const declineInvitation = useCallback(async (invitationId: string) => {
    setError(null);

    try {
      const declineInvitationFn = httpsCallable<
        { invitationId: string },
        { success: boolean }
      >(functions, 'declineInvitation');

      await declineInvitationFn({ invitationId });

      // Remove from local state
      setPendingInvitations(prev =>
        prev.filter(inv => inv.id !== invitationId)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to decline invitation';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Load invitations on mount
  useEffect(() => {
    refreshInvitations();
  }, [refreshInvitations]);

  return {
    pendingInvitations,
    loading,
    error,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    refreshInvitations,
  };
}
