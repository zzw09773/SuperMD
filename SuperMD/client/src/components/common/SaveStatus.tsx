import { SaveStatus as SaveStatusType } from '../../types';

interface SaveStatusProps {
  status: SaveStatusType['status'];
  lastSaved?: Date;
}

const SaveStatus = ({ status, lastSaved }: SaveStatusProps) => {
  const getStatusText = () => {
    switch (status) {
      case 'saved':
        return lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Saved';
      case 'saving':
        return 'Saving...';
      case 'error':
        return 'Error saving';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'saved':
        return 'text-green-600 dark:text-green-400';
      case 'saving':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
    </div>
  );
};

export default SaveStatus;
