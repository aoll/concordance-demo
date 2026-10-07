// Preuve des lots 2 et 4 côté front : carte branchée sur les hooks Orval, inscription optimiste,
// rollback sur 409 ZONE_FULL, fin de shift, déconnexion. Tourne sur la vraie API (Nest + Postgres),
// en téléphone puis en tablette. Les écritures du navigateur sont retenues 600 ms (page.route)
// pour voir l'optimisme avant la réponse ; la course est jouée par d'autres managers via l'API.
// Prérequis : Postgres du docker compose (pnpm db:up) et l'API buildée (pnpm build).
// Base dédiée concordance_front_proof, recréée à chaque run. Captures dans $PROOF_DIR (./front-proof).
import { execFileSync, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium, devices } from 'playwright-core';

const PROOF_DIR = process.env.PROOF_DIR ?? 'front-proof';
const PORT = 5174;
const APP = `http://localhost:${PORT}`;
const API = 'http://localhost:3000/api';
const DB = 'concordance_front_proof';
const WRITE_DELAY = 600;

const psql = (sql) =>
  execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'concordance', '-c', sql], {
    cwd: '../..',
    stdio: 'pipe',
  });
psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
psql(`CREATE DATABASE ${DB}`);

const waitFor = (child, text, name) =>
  new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => chunk.toString().includes(text) && resolve());
    child.stderr.on('data', (chunk) => {
      if (!/ws proxy|ECONNRESET|EPIPE|stream_base_commons/.test(chunk)) {
        process.stderr.write(`[${name}] ${chunk}`);
      }
    });
    child.on('exit', (code) => reject(new Error(`${name} arrêté (${code})`)));
  });

const api = spawn('node', ['dist/main.js'], {
  cwd: '../api',
  stdio: 'pipe',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'secret-de-preuve-locale',
    DATABASE_URL: `postgres://concordance:concordance@localhost:5432/${DB}`,
  },
});
const children = [api];
process.on('exit', () => {
  for (const child of children) child.kill();
});
await waitFor(api, 'API prête', 'API');
const vite = spawn('node_modules/.bin/vite', ['--port', String(PORT), '--strictPort'], {
  stdio: 'pipe',
});
children.push(vite);
await waitFor(vite, String(PORT), 'vite');

/** Un autre manager, piloté directement par l'API : connexion puis inscription sur une zone. */
async function otherManagerJoins(zoneName, displayName) {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const zones = await (await fetch(`${API}/zones`)).json();
  const zoneId = zones.find((zone) => zone.name === zoneName).id;
  const created = await fetch(`${API}/presences`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ zoneId }),
  });
  const presence = await created.json();
  return () =>
    fetch(`${API}/presences/${presence.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ status: 'ENDED' }),
    });
}

const check = (label, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});

async function run(name, device) {
  console.log(`\n— ${name}`);
  const context = await browser.newContext({ ...device, locale: 'fr-FR' });
  const page = await context.newPage();
  // Écritures retenues côté navigateur : l'UI optimiste doit bouger avant la réponse.
  // Pendant la course, la requête attend que les autres managers aient pris les places.
  let gate;
  await page.route(`${APP}/api/presences**`, async (route) => {
    if (route.request().method() === 'GET') return route.continue();
    await (gate ?? sleep(WRITE_DELAY));
    await route.continue();
  });
  const shot = (step) => page.screenshot({ path: `${PROOF_DIR}/${name}-${step}.png` });
  const count = (zone) => page.getByTestId(`count-${zone}`);
  const zone = (label) => page.getByRole('button', { name: new RegExp(`^${label},`) });
  const panel = page.locator('aside.panel');

  await page.goto(APP);
  await page.getByRole('heading', { name: 'Bienvenue' }).waitFor();
  check('écran de connexion par pseudo', true);
  await shot('1-connexion');

  await page.getByLabel('Pseudo').fill('Alex L.');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await count('La Défense').getByText('3/3').waitFor();
  check(
    'carte : occupation lue via useListZones (La Défense 3/3, Paris rive gauche 5/6)',
    (await count('Paris rive gauche').textContent()) === '5/6',
  );
  check(
    'carte : La Défense complète (hachures)',
    (await zone('La Défense').locator('.hatch').count()) === 1,
  );
  await shot('2-carte');

  // Inscription optimiste sur Orly : le compteur bouge avant la réponse (600 ms).
  await zone('Orly').click();
  check(
    'panneau : Orly sélectionnée',
    await panel.getByRole('heading', { name: 'Orly' }).isVisible(),
  );
  const orlyId = (await (await fetch(`${API}/zones`)).json()).find((z) => z.name === 'Orly').id;
  await page.waitForURL((url) => url.searchParams.get('zone') === orlyId);
  check(`URL : ?zone=${orlyId}, l'id de la zone dans l'API`, true);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/presences') && r.request().method() === 'POST',
  );
  const clickedAt = Date.now();
  await panel.getByRole('button', { name: "Je m'inscris ici" }).click();
  await count('Orly').getByText('1/3').waitFor({ timeout: 300 });
  const optimisticAfter = Date.now() - clickedAt;
  const created = await response;
  check(
    `optimiste : 1/3 affiché en ${optimisticAfter} ms, réponse ${created.status()} arrivée après`,
    created.status() === 201 && optimisticAfter < 500,
  );
  await page.getByRole('status').getByText('En shift sur').waitFor();
  check(
    'bandeau « En shift sur Orly »',
    (await page.locator('.shift strong').textContent()) === 'Orly',
  );
  check('panneau : « Alex L. (vous) » listé', await panel.getByText('Alex L. (vous)').isVisible());
  await shot('3-en-shift');

  // Une autre zone est verrouillée tant que le shift est en cours.
  await zone('Saint-Denis').click();
  check(
    'autre zone : inscription désactivée pendant le shift',
    await panel.getByRole('button', { name: "Je m'inscris ici" }).isDisabled(),
  );

  // Fin de shift depuis le bandeau, elle aussi optimiste.
  await page.locator('.shift').getByRole('button', { name: 'Terminer mon shift' }).click();
  await count('Orly').getByText('0/3').waitFor({ timeout: 300 });
  await page.locator('.shift').waitFor({ state: 'detached' });
  check('fin de shift : Orly revient à 0/3 et le bandeau disparaît', true);

  // Course perdue : d'autres managers prennent les places de Saint-Denis pendant notre requête.
  // Le temps réel montre leurs arrivées, l'API répond 409 ZONE_FULL, rollback.
  // On attend d'abord la resynchronisation de la fin de shift (bouton réactivé).
  const joinButton = panel.getByRole('button', { name: "Je m'inscris ici" });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('aside.panel button')].at(-1);
    return button && !button.disabled;
  });
  check('Saint-Denis à 1/4 avant la course', (await count('Saint-Denis').textContent()) === '1/4');
  let othersIn;
  gate = new Promise((resolve) => {
    othersIn = resolve;
  });
  await joinButton.click();
  await count('Saint-Denis').getByText('2/4').waitFor({ timeout: 300 });
  check('optimiste : 2/4 affiché avant la réponse', true);
  const leaves = [];
  for (const who of ['Rachid A.', 'Camille J.', 'Lucas H.']) {
    leaves.push(await otherManagerJoins('Saint-Denis', who));
  }
  othersIn();
  gate = undefined;
  await page.getByTestId('toast').getByText("vient d'être complétée").waitFor();
  check('409 ZONE_FULL : toast avec un message clair', true);
  check(
    "fil d'activité : l'arrivée des autres managers est affichée",
    await panel.getByText('Lucas H. a rejoint Saint-Denis').isVisible(),
  );
  await count('Saint-Denis').getByText('4/4').waitFor();
  check(
    'rollback puis resynchronisation : Saint-Denis 4/4, pas de shift',
    (await page.locator('.shift').count()) === 0,
  );
  await shot('4-zone-pleine');

  // Déconnexion : retour à l'écran de connexion, cache hors ligne vidé.
  await page.getByRole('button', { name: /^Compte de / }).click();
  await page.getByRole('menuitem', { name: /Se déconnecter/ }).click();
  await page.getByRole('heading', { name: 'Bienvenue' }).waitFor();
  check('déconnexion : retour à la connexion', true);
  await context.close();
  // Les autres managers libèrent Saint-Denis pour le parcours suivant.
  await Promise.all(leaves.map((leave) => leave()));
}

try {
  await mkdir(PROOF_DIR, { recursive: true });
  await run('telephone', devices['Pixel 7']);
  await run('tablette', devices['iPad Pro 11 landscape']);
} finally {
  await browser.close();
  process.exit();
}
