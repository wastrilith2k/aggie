import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { useAuth } from '../firebase/AuthContext';

// Types for account data
export type ServiceId = 'google' | 'microsoft' | 'trello';

export interface ConnectedService {
  id: ServiceId;
  status: 'active' | 'expired' | 'revoked';
  metadata: {
    email?: string;
    scopes?: string[];
  };
  connectedAt: string;
  lastRefreshed: string;
  tokenExpiry: string | null;
}

export interface Member {
  id: string;
  email: string;
  role: 'owner' | 'member';
  addedAt: string;
}

export interface Account {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

interface AccountContextType {
  account: Account | null;
  services: ConnectedService[];
  loading: boolean;
  error: string | null;
  refreshAccount: () => Promise<void>;
  refreshServices: () => Promise<void>;
  connectService: (serviceId: ServiceId) => Promise<void>;
  disconnectService: (serviceId: ServiceId) => Promise<void>;
  isOwner: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

interface AccountProviderProps {
  children: React.ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  const { user, isAuthorized } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [services, setServices] = useState<ConnectedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is the account owner
  const isOwner = account?.ownerId === user?.uid;

  // Ensure user exists and has an account
  const ensureUser = useCallback(async () => {
    if (!user || !isAuthorized) return null;

    try {
      const ensureUserFn = httpsCallable<void, {
        success: boolean;
        account: { id: string; name: string; ownerId: string; ownerEmail: string } | null;
      }>(functions, 'ensureUser');

      const result = await ensureUserFn();
      return result.data.account;
    } catch (err) {
      console.error('Error ensuring user:', err);
      throw err;
    }
  }, [user, isAuthorized]);

  // Fetch account details
  const refreshAccount = useCallback(async () => {
    if (!user || !isAuthorized) {
      setAccount(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // First ensure user has an account
      const basicAccount = await ensureUser();
      if (!basicAccount) {
        setAccount(null);
        return;
      }

      // Then get full account details
      const getAccountFn = httpsCallable<
        { accountId?: string },
        {
          success: boolean;
          account: Account | null;
        }
      >(functions, 'getAccount');

      const result = await getAccountFn({ accountId: basicAccount.id });

      if (result.data.success && result.data.account) {
        setAccount(result.data.account);
      } else {
        setAccount(null);
      }
    } catch (err) {
      console.error('Error fetching account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [user, isAuthorized, ensureUser]);

  // Fetch connected services
  const refreshServices = useCallback(async () => {
    if (!account) {
      setServices([]);
      return;
    }

    try {
      const getServicesFn = httpsCallable<
        { accountId: string },
        {
          success: boolean;
          services: ConnectedService[];
        }
      >(functions, 'getAccountServices');

      const result = await getServicesFn({ accountId: account.id });

      if (result.data.success) {
        setServices(result.data.services);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, [account]);

  // Connect a service via OAuth
  const connectService = useCallback(async (serviceId: ServiceId) => {
    if (!account || !user) {
      throw new Error('No account available');
    }

    // Get current user's ID token
    const idToken = await user.getIdToken();

    // Determine the OAuth initiate URL based on service
    const functionName = {
      google: 'googleOAuthInitiate',
      microsoft: 'microsoftOAuthInitiate',
      trello: 'trelloOAuthInitiate',
    }[serviceId];

    // Build the OAuth URL
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const region = 'us-central1';
    const returnUrl = window.location.origin;

    const params = new URLSearchParams({
      accountId: account.id,
      idToken,
      returnUrl,
    });

    const oauthUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}?${params.toString()}`;

    // Redirect to OAuth flow
    window.location.href = oauthUrl;
  }, [account, user]);

  // Disconnect a service
  const disconnectService = useCallback(async (serviceId: ServiceId) => {
    if (!account) {
      throw new Error('No account available');
    }

    const disconnectFn = httpsCallable<
      { accountId: string; serviceId: string },
      { success: boolean }
    >(functions, 'disconnectService');

    await disconnectFn({ accountId: account.id, serviceId });

    // Refresh services list
    await refreshServices();
  }, [account, refreshServices]);

  // Load account on mount and when user changes
  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  // Load services when account changes
  useEffect(() => {
    if (account) {
      refreshServices();
    }
  }, [account, refreshServices]);

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const oauthError = params.get('error');

    if (connected || oauthError) {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);

      if (oauthError) {
        setError(decodeURIComponent(oauthError));
      } else if (connected) {
        // Refresh services to show newly connected service
        refreshServices();
      }
    }
  }, [refreshServices]);

  const value: AccountContextType = {
    account,
    services,
    loading,
    error,
    refreshAccount,
    refreshServices,
    connectService,
    disconnectService,
    isOwner,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}
