
import { useOffline } from '@/context/OfflineContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, RefreshCcw } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, hasPendingChanges } = useOffline();
  
  if (isOnline && !hasPendingChanges) {
    return null;
  }
  
  return (
    <Alert variant={isOnline ? "default" : "destructive"} className="mb-4">
      <div className="flex items-center">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 mr-2" />
            <AlertDescription>
              Syncing your offline changes... 
              <RefreshCcw className="h-3 w-3 inline ml-1 animate-spin" />
            </AlertDescription>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 mr-2" />
            <AlertDescription>
              You are offline. Changes will be saved and synced when you reconnect.
            </AlertDescription>
          </>
        )}
      </div>
    </Alert>
  );
}
