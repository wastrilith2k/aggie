import { useState } from 'react';
import { Users, Crown, UserMinus, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { useAccount, Member } from '../../contexts/AccountContext';

export function MembersList() {
  const { account, isOwner, refreshAccount } = useAccount();
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!account) {
    return null;
  }

  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`Remove ${member.email} from this account?`)) {
      return;
    }

    setRemovingMember(member.id);
    setError(null);

    try {
      const removeMemberFn = httpsCallable<
        { accountId: string; memberId: string },
        { success: boolean }
      >(functions, 'removeMember');

      await removeMemberFn({
        accountId: account.id,
        memberId: member.id,
      });

      await refreshAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Team Members
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({account.members.length})
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
        {account.members.map(member => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">
                {member.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {member.email}
                  </span>
                  {member.role === 'owner' && (
                    <span title="Owner">
                    <Crown className="w-4 h-4 text-amber-500" />
                  </span>
                  )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {member.role === 'owner' ? 'Owner' : 'Member'} · Joined{' '}
                  {new Date(member.addedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {isOwner && member.role !== 'owner' && (
              <button
                onClick={() => handleRemoveMember(member)}
                disabled={removingMember === member.id}
                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                title="Remove member"
              >
                {removingMember === member.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UserMinus className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
