
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface OfflineContextType {
  isOnline: boolean;
  hasPendingChanges: boolean;
  checkForPendingChanges: () => Promise<boolean>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const { user } = useAuth();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('You are back online!');
      
      // Trigger sync if user is logged in
      if (user) {
        navigator.serviceWorker.ready.then(registration => {
          if ('sync' in registration && 'register' in registration.sync) {
            registration.sync.register('sync-notes-queue')
              .then(() => console.log('Back online sync registered'));
          }
        }).catch(err => console.error('Failed to register sync on reconnect:', err));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Changes will be saved when you reconnect.');
    };

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PENDING_CHANGES_STATUS') {
        setHasPendingChanges(event.data.hasPendingChanges);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check for pending changes on initial load
    checkForPendingChanges();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [user]);

  // Check for pending changes in IndexedDB
  const checkForPendingChanges = async (): Promise<boolean> => {
    if (!navigator.serviceWorker.controller) {
      return false;
    }

    try {
      // Ask service worker about pending changes
      const messageChannel = new MessageChannel();
      
      const pendingChangesPromise = new Promise<boolean>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.type === 'PENDING_CHANGES_RESPONSE') {
            setHasPendingChanges(event.data.hasPendingChanges);
            resolve(event.data.hasPendingChanges);
          }
        };
      });

      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_PENDING_CHANGES'
      }, [messageChannel.port2]);

      return await pendingChangesPromise;
    } catch (error) {
      console.error('Error checking pending changes:', error);
      return false;
    }
  };

  return (
    <OfflineContext.Provider value={{
      isOnline,
      hasPendingChanges,
      checkForPendingChanges
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
