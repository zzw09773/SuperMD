interface CollaborationStatusProps {
  userCount: number;
}

const CollaborationStatus = ({ userCount }: CollaborationStatusProps) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {userCount} {userCount === 1 ? 'user' : 'users'} online
      </span>
    </div>
  );
};

export default CollaborationStatus;
