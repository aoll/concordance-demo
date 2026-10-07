import type { z } from 'zod';
import type { ManagerRow } from '../database/schema';
import type { ManagerSchema } from './manager.dto';

/** Modèle → DTO : mapping explicite, les champs internes (email, matricule…) restent en base. */
export function toManager(
  row: Pick<ManagerRow, 'id' | 'displayName'>,
): z.infer<typeof ManagerSchema> {
  return { id: row.id, displayName: row.displayName };
}
