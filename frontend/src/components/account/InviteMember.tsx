import { useState, FormEvent } from 'react';
import { UserPlus, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAccount } from '../../contexts/AccountContext';
import { useInvitations } from '../../hooks/useInvitations';

export function InviteMember() {
  const { isOwner } = useAccount();
  const { sendInvitation } = useInvitations();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await sendInvitation(email.trim());
      setSuccess(true);
      setEmail('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Invite Team Member
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="invite-email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email address
          </label>
          <input
            type="email"
            id="invite-email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <Check className="w-4 h-4" />
            Invitation sent successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Send Invitation
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        The invited user will receive access to search all connected services.
        Invitations expire after 7 days.
      </p>
    </div>
  );
}
