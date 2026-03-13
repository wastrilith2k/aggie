import { useState } from 'react';
import {
  Cloud,
  Mail,
  Trello,
  Check,
  AlertCircle,
  Loader2,
  Unplug,
} from 'lucide-react';
import { useAccount, ServiceId, ConnectedService } from '../../contexts/AccountContext';

// Service configuration
const SERVICE_CONFIG: Record<ServiceId, {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: string[];
}> = {
  google: {
    name: 'Google',
    description: 'Drive, Gmail, and Calendar',
    icon: Mail, // Using Mail as a generic Google icon
    color: 'text-blue-500',
    features: ['Google Drive files', 'Gmail messages', 'Calendar events'],
  },
  microsoft: {
    name: 'Microsoft',
    description: 'OneDrive files',
    icon: Cloud,
    color: 'text-sky-500',
    features: ['OneDrive files and folders'],
  },
  trello: {
    name: 'Trello',
    description: 'Boards and cards',
    icon: Trello,
    color: 'text-blue-400',
    features: ['Trello cards', 'Board content'],
  },
};

interface ServiceCardProps {
  serviceId: ServiceId;
  connectedService?: ConnectedService;
  onConnect: () => void;
  onDisconnect: () => void;
  isOwner: boolean;
  loading: boolean;
}

function ServiceCard({
  serviceId,
  connectedService,
  onConnect,
  onDisconnect,
  isOwner,
  loading,
}: ServiceCardProps) {
  const config = SERVICE_CONFIG[serviceId];
  const Icon = config.icon;
  const isConnected = connectedService?.status === 'active';
  const isExpired = connectedService?.status === 'expired';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-700 ${config.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {config.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {config.description}
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
            <Check className="w-4 h-4" />
            <span>Connected</span>
          </div>
        )}

        {isExpired && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Expired</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Searches:</p>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          {config.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-400" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {connectedService?.metadata.email && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Connected as: </span>
          <span className="text-gray-700 dark:text-gray-300">
            {connectedService.metadata.email}
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {!isConnected && isOwner && (
          <button
            onClick={onConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>Connect</>
            )}
          </button>
        )}

        {isConnected && isOwner && (
          <button
            onClick={onDisconnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unplug className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        )}

        {(isExpired || isConnected) && isOwner && !isConnected && (
          <button
            onClick={onConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>Reconnect</>
            )}
          </button>
        )}

        {!isOwner && !isConnected && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Only the account owner can connect services
          </p>
        )}
      </div>
    </div>
  );
}

export function ConnectedServices() {
  const { services, connectService, disconnectService, isOwner, error } = useAccount();
  const [loadingService, setLoadingService] = useState<ServiceId | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConnect = async (serviceId: ServiceId) => {
    setLoadingService(serviceId);
    setLocalError(null);
    try {
      await connectService(serviceId);
      // Page will redirect to OAuth flow
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to connect service');
      setLoadingService(null);
    }
  };

  const handleDisconnect = async (serviceId: ServiceId) => {
    if (!confirm(`Are you sure you want to disconnect ${SERVICE_CONFIG[serviceId].name}?`)) {
      return;
    }

    setLoadingService(serviceId);
    setLocalError(null);
    try {
      await disconnectService(serviceId);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to disconnect service');
    } finally {
      setLoadingService(null);
    }
  };

  // Get connected service by ID
  const getService = (id: ServiceId) =>
    services.find(s => s.id === id);

  const displayError = localError || error;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Connected Services
      </h2>

      {displayError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p>{displayError}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(['google', 'microsoft', 'trello'] as ServiceId[]).map(serviceId => (
          <ServiceCard
            key={serviceId}
            serviceId={serviceId}
            connectedService={getService(serviceId)}
            onConnect={() => handleConnect(serviceId)}
            onDisconnect={() => handleDisconnect(serviceId)}
            isOwner={isOwner}
            loading={loadingService === serviceId}
          />
        ))}
      </div>
    </div>
  );
}
