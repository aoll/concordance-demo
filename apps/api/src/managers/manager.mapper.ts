import type { z } from 'zod';
import type { ManagerSchema } from './manager.dto';
import type { ManagerRow } from './managers.schema';

/** Model → DTO: explicit mapping, internal fields (email, employee ID…) stay in the database. */
export function toManager(
  row: Pick<ManagerRow, 'id' | 'displayName'>,
): z.infer<typeof ManagerSchema> {
  return { id: row.id, displayName: row.displayName };
}
