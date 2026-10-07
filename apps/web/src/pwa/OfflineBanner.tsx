import { useSyncExternalStore } from 'react';

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
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '8px 16px',
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        background: '#5c4400',
        color: '#fff',
        font: '500 14px system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      Hors ligne : dernière occupation connue affichée.
    </div>
  );
}
