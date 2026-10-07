import { CircleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Toast d'erreur des actions de shift (409 compris) : se ferme seul, ou au toucher. */
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <Alert
      data-testid="toast"
      className="animate-in fade-in slide-in-from-top-2 bg-destructive fixed top-[calc(12px+env(safe-area-inset-top,0px))] left-1/2 z-20 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 border-transparent pr-12 text-white shadow-lg"
    >
      <CircleAlert />
      <AlertDescription className="text-white">{message}</AlertDescription>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2 text-white hover:bg-white/15 hover:text-white"
        aria-label="Fermer"
        onClick={onClose}
      >
        <X />
      </Button>
    </Alert>
  );
}
