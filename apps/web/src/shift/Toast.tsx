import { useEffect } from 'react';

/** Toast d'erreur des actions de shift (409 compris) : se ferme seul, ou au toucher. */
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast" role="alert" data-testid="toast">
      <span>{message}</span>
      <button type="button" aria-label="Fermer" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
