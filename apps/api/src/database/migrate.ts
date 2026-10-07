import { join } from 'node:path';
import { ZONES } from '@concordance/contracts';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { type Database, one } from './database.module';
import { managers, presences, zones } from './schema';

/** Migrations SQL générées par drizzle-kit (apps/api/drizzle). */
const MIGRATIONS_FOLDER = join(__dirname, '..', '..', 'drizzle');

export async function migrateDatabase(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

/** Occupation de départ, reprise de la maquette. */
const DEMO_PRESENCES: Record<string, string[]> = {
  'paris-rive-droite': ['Karim B.', 'Sophie T.', 'Julien R.'],
  'paris-rive-gauche': ['Nadia K.', 'Thomas G.', 'Léa M.', 'Hugo P.', 'Inès D.'],
  'la-defense': ['Marc V.', 'Claire F.', 'Yanis O.'],
  'saint-denis': ['Fatou S.'],
  'marne-la-vallee': ['Paul N.', 'Emma C.'],
};

/**
 * Seed idempotent. Les 6 zones de la carte sont toujours remises à jour (slug = id du path SVG).
 * Les managers de démo et leurs shifts ne sont créés que sur une base sans manager.
 */
export async function seedDatabase(db: Database, options = { demoPresences: true }) {
  await db
    .insert(zones)
    .values([...ZONES])
    .onConflictDoUpdate({
      target: zones.slug,
      set: { name: sql`excluded.name`, capacity: sql`excluded.capacity` },
    });
  if (!options.demoPresences) return;

  await db.transaction(async (tx) => {
    const { count } = one(await tx.select({ count: sql<number>`count(*)::int` }).from(managers));
    if (count > 0) return;
    const zoneIds = new Map((await tx.select().from(zones)).map((zone) => [zone.slug, zone.id]));
    let matricule = 100;
    for (const [slug, names] of Object.entries(DEMO_PRESENCES)) {
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
        const zoneId = zoneIds.get(slug);
        if (zoneId) await tx.insert(presences).values({ managerId: manager.id, zoneId });
      }
    }
  });
}
