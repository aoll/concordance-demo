import { z } from 'zod';

/**
 * Public view of a manager. The database model also carries email, employee ID and phone:
 * they never leave, because Zod serialization strips any field not declared here.
 */
export const ManagerSchema = z
  .object({
    id: z.uuid(),
    displayName: z.string(),
  })
  .meta({ id: 'Manager' });
