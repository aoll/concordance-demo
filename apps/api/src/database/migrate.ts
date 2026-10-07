import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { type Database, one } from './database.module';
import { managers, presences, zones } from './schema';
import { SEED_ZONES } from './seed-zones';

/** Migrations SQL générées par drizzle-kit (apps/api/drizzle). */
const MIGRATIONS_FOLDER = join(__dirname, '..', '..', 'drizzle');

export async function migrateDatabase(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

/** Occupation de départ, reprise de la maquette (par nom de zone). */
const DEMO_PRESENCES: Record<string, string[]> = {
  'Paris rive droite': ['Karim B.', 'Sophie T.', 'Julien R.'],
  'Paris rive gauche': ['Nadia K.', 'Thomas G.', 'Léa M.', 'Hugo P.', 'Inès D.'],
  'La Défense': ['Marc V.', 'Claire F.', 'Yanis O.'],
  'Saint-Denis': ['Fatou S.'],
  'Marne-la-Vallée': ['Paul N.', 'Emma C.'],
};

/**
 * Seed idempotent, qui ne remplit que ce qui est vide : les zones de départ dans une base sans
 * zone (elles vivent ensuite en base), les managers de démo et leurs shifts dans une base sans
 * manager. Une capacité modifiée en base n'est donc jamais écrasée au redémarrage.
 */
export async function seedDatabase(db: Database, options = { demoPresences: true }) {
  await db.transaction(async (tx) => {
    const { count } = one(await tx.select({ count: sql<number>`count(*)::int` }).from(zones));
    if (count === 0) await tx.insert(zones).values([...SEED_ZONES]);
  });
  if (!options.demoPresences) return;

  await db.transaction(async (tx) => {
    const { count } = one(await tx.select({ count: sql<number>`count(*)::int` }).from(managers));
    if (count > 0) return;
    const zoneIds = new Map((await tx.select().from(zones)).map((zone) => [zone.name, zone.id]));
    let matricule = 100;
    for (const [zoneName, names] of Object.entries(DEMO_PRESENCES)) {
      for (const displayName of names) {
        matricule += 1;
        const manager = one(
          await tx
            .insert(managers)
            .values({
              displayName,
              email: `manager${matricule}@ratp.example`,
              matricule: `M${matricule}`,
              phone: `06 12 34 ${matricule}`,
            })
            .returning(),
        );
        const zoneId = zoneIds.get(zoneName);
        if (zoneId) await tx.insert(presences).values({ managerId: manager.id, zoneId });
      }
    }
  });
}
