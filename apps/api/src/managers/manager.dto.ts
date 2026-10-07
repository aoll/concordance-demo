import { z } from 'zod';

/**
 * Vue publique d'un manager. Le modèle en base porte aussi email, matricule et téléphone :
 * ils ne sortent jamais, car la sérialisation Zod retire tout champ non déclaré ici.
 */
export const ManagerSchema = z
  .object({
    id: z.uuid(),
    displayName: z.string(),
  })
  .meta({ id: 'Manager' });
