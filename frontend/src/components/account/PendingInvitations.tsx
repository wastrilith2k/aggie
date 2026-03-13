import { useState } from 'react';
import { Mail, Check, X, Loader2, Clock } from 'lucide-react';
import { useInvitations, Invitation } from '../../hooks/useInvitations';

export function PendingInvitations() {
  const { pendingInvitations, acceptInvitation, declineInvitation, loading } = useInvitations();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  const handleAccept = async (invitation: Invitation) => {
    setProcessingId(invitation.id);
    try {
      await acceptInvitation(invitation.id);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: Invitation) => {
    setProcessingId(invitation.id);
    try {
      await declineInvitation(invitation.id);
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    return `${hours}h remaining`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pending Invitations
        </h2>
        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full">
          {pendingInvitations.length}
        </span>
      </div>

      <div className="space-y-3">
        {pendingInvitations.map(invitation => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {invitation.accountName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invited by {invitation.inviterEmail}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <Clock className="w-3 h-3" />
                {formatTimeRemaining(invitation.expiresAt)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDecline(invitation)}
                disabled={processingId === invitation.id}
                className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                title="Decline"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <X className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => handleAccept(invitation)}
                disabled={processingId === invitation.id}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processingId === invitation.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Accept
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
