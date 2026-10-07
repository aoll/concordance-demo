import { ApiError, type ErrorResponse } from '@concordance/api-client';

const MESSAGES: Partial<Record<ErrorResponse['code'], string>> = {
  ZONE_FULL: "Cette zone vient d'être complétée. Choisissez une autre zone.",
  ALREADY_PRESENT: 'Vous avez déjà un shift en cours. Terminez-le pour changer de zone.',
  PRESENCE_ALREADY_ENDED: 'Ce shift était déjà terminé.',
  FORBIDDEN: 'Ce shift appartient à un autre manager.',
  UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
};

/** Message shown for an API error: we read the business code, never the raw message. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const code = (error.body as Partial<ErrorResponse> | undefined)?.code;
    if (code && MESSAGES[code]) return MESSAGES[code];
  }
  return 'Une erreur est survenue. Réessayez.';
}
