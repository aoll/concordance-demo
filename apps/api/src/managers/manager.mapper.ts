import type { z } from 'zod';
import type { ManagerSchema } from './manager.dto';
import type { ManagerRow } from './managers.schema';

/** Modèle → DTO : mapping explicite, les champs internes (email, matricule…) restent en base. */
export function toManager(
  row: Pick<ManagerRow, 'id' | 'displayName'>,
): z.infer<typeof ManagerSchema> {
  return { id: row.id, displayName: row.displayName };
}
