import { Users, Wifi, WifiOff } from 'lucide-react';

interface CollaborationStatusProps {
  users: Array<{ id: string; name: string }>;
  isConnected: boolean;
}

const CollaborationStatus = ({ users, isConnected }: CollaborationStatusProps) => {
  const userCount = users.length;

  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded ${
        isConnected
          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      }`}>
        {isConnected ? (
          <Wifi className="w-3 h-3" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        <span className="text-xs font-medium">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* User Count */}
      {isConnected && (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded">
          <Users className="w-3 h-3 text-blue-700 dark:text-blue-300" />
          <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
            {userCount} {userCount === 1 ? 'user' : 'users'}
          </span>
        </div>
      )}
    </div>
  );
};

export default CollaborationStatus;
