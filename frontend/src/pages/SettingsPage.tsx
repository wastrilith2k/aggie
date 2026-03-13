import { ArrowLeft, Loader2, Settings } from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';
import { ConnectedServices } from '../components/account/ConnectedServices';
import { MembersList } from '../components/account/MembersList';
import { InviteMember } from '../components/account/InviteMember';
import { PendingInvitations } from '../components/account/PendingInvitations';
import { ThemeToggle } from '../components';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { account, loading, error } = useAccount();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="text-blue-500 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Back to Search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Settings
                </h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Account Info */}
        {account && (
          <div className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {account.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Owner: {account.ownerEmail}
            </p>
          </div>
        )}

        {/* Pending Invitations */}
        <PendingInvitations />

        {/* Connected Services */}
        <section className="mb-8">
          <ConnectedServices />
        </section>

        {/* Team Section */}
        <section className="mb-8">
          <MembersList />
        </section>

        {/* Invite Member */}
        <section>
          <InviteMember />
        </section>
      </main>
    </div>
  );
}
