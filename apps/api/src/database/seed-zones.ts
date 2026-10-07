import type { zones } from '../zones/zones.schema';

/**
 * Zones de départ, reprises de la maquette (plan schématique, viewBox 800 × 600).
 * Elles ne sont insérées que dans une base sans zone : ensuite, les zones vivent en base
 * (nom, capacité, ordre, tracé) et le front les dessine telles que l'API les renvoie.
 * Les id sont fixes pour qu'un lien `?zone=<id>` soit le même en local, en test et sur Railway.
 */
export const SEED_ZONES = [
  {
    id: '06947ae2-f0ae-40b3-8870-a27577f2e5bb',
    name: 'Paris rive droite',
    capacity: 6,
    position: 1,
    shape:
      'M334,318 C328,250 368,214 422,214 C480,214 518,250 512,318 C482,300 452,288 422,290 C392,292 360,304 334,318 Z',
    labelX: 472,
    labelY: 256,
  },
  {
    id: 'b33023cc-4156-4114-911f-3604a3ec7701',
    name: 'Paris rive gauche',
    capacity: 6,
    position: 2,
    shape:
      'M334,318 C345,355 380,374 422,374 C468,374 500,352 512,318 C482,300 452,288 422,290 C392,292 360,304 334,318 Z',
    labelX: 372,
    labelY: 338,
  },
  {
    id: 'b7a46401-e31d-4198-9b0d-c2865c4d0671',
    name: 'La Défense',
    capacity: 3,
    position: 3,
    shape:
      'M212,226 C222.3,216.0 247.7,206.7 262,206 C276.3,205.3 291.0,210.3 298,222 C305.0,233.7 307.3,261.0 304,276 C300.7,291.0 291.0,307.0 278,312 C265.0,317.0 239.0,313.7 226,306 C213.0,298.3 202.3,279.3 200,266 C197.7,252.7 201.7,236.0 212,226 Z',
    labelX: 256,
    labelY: 226,
  },
  {
    id: '08777644-b822-4109-aa98-b8938b5fb7c8',
    name: 'Saint-Denis',
    capacity: 4,
    position: 4,
    shape:
      'M368,124 C381.3,112.3 417.0,106.3 440,106 C463.0,105.7 492.7,111.0 506,122 C519.3,133.0 524.0,158.7 520,172 C516.0,185.3 500.7,196.7 482,202 C463.3,207.3 428.3,208.3 408,204 C387.7,199.7 366.7,189.3 360,176 C353.3,162.7 354.7,135.7 368,124 Z',
    labelX: 402,
    labelY: 140,
  },
  {
    id: 'e7b7db44-b92e-4602-a619-0b04bbd41bef',
    name: 'Marne-la-Vallée',
    capacity: 4,
    position: 5,
    shape:
      'M566,248 C581.7,233.3 623.3,229.3 650,230 C676.7,230.7 710.3,238.3 726,252 C741.7,265.7 747.7,294.0 744,312 C740.3,330.0 725.3,351.3 704,360 C682.7,368.7 640.7,371.0 616,364 C591.3,357.0 564.3,337.3 556,318 C547.7,298.7 550.3,262.7 566,248 Z',
    labelX: 640,
    labelY: 266,
  },
  {
    id: 'fe1eeee3-43a9-4a5d-867d-a2a9a77cf978',
    name: 'Orly',
    capacity: 3,
    position: 6,
    shape:
      'M372,405 C387.0,392.3 426.0,393.2 450,394 C474.0,394.8 502.3,397.7 516,410 C529.7,422.3 536.3,449.0 532,468 C527.7,487.0 511.3,514.7 490,524 C468.7,533.3 425.7,533.0 404,524 C382.3,515.0 365.3,489.8 360,470 C354.7,450.2 357.0,417.7 372,405 Z',
    labelX: 428,
    labelY: 486,
  },
] as const satisfies (typeof zones.$inferInsert)[];

/** Raccourci pour les tests : l'id d'une zone de départ à partir de son nom. */
export function seedZoneId(name: (typeof SEED_ZONES)[number]['name']): string {
  const zone = SEED_ZONES.find((candidate) => candidate.name === name);
  if (!zone) throw new Error(name);
  return zone.id;
}
