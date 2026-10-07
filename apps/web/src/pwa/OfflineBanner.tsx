import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <Alert
      role="status"
      className="sticky top-0 z-[1000] justify-center rounded-none border-0 bg-[#5c4400] pt-[max(8px,env(safe-area-inset-top))] pb-2 text-white"
    >
      <WifiOff />
      <AlertDescription className="text-white">
        Hors ligne : dernière occupation connue affichée.
      </AlertDescription>
    </Alert>
  );
}
