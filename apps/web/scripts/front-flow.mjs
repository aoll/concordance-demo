// Front-end proof for lots 2 and 4: map wired to the Orval hooks, optimistic sign-up,
// rollback on 409 ZONE_FULL, end of shift, logout. Runs against the real API (Nest + Postgres),
// on a phone then a tablet. Browser writes are held back 600 ms (page.route)
// to see the optimism before the response; the race is played by other managers via the API.
// Prerequisites: Postgres from docker compose (pnpm db:up) and the built API (pnpm build).
// Dedicated database concordance_front_proof, recreated on every run. Screenshots in $PROOF_DIR (./front-proof).
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

/** Another manager, driven directly through the API: login then sign-up on a zone. */
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
    fetch(`${API}/presences/${presence.id}/status`, {
      method: 'PUT',
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
  // Writes held back on the browser side: the optimistic UI must move before the response.
  // During the race, the request waits until the other managers have taken the spots.
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

  // Optimistic sign-up on Orly: the counter moves before the response (600 ms).
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

  // Another zone is locked while the shift is in progress.
  await zone('Saint-Denis').click();
  check(
    'autre zone : inscription désactivée pendant le shift',
    await panel.getByRole('button', { name: "Je m'inscris ici" }).isDisabled(),
  );

  // End of shift from the banner, also optimistic.
  await page.locator('.shift').getByRole('button', { name: 'Terminer mon shift' }).click();
  await count('Orly').getByText('0/3').waitFor({ timeout: 300 });
  await page.locator('.shift').waitFor({ state: 'detached' });
  check('fin de shift : Orly revient à 0/3 et le bandeau disparaît', true);

  // Lost race: other managers take the Saint-Denis spots during our request.
  // Realtime shows their arrivals, the API answers 409 ZONE_FULL, rollback.
  // First we wait for the end-of-shift resync (button re-enabled).
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

  // Logout: back to the login screen, offline cache cleared.
  await page.getByRole('button', { name: /^Compte de / }).click();
  await page.getByRole('menuitem', { name: /Se déconnecter/ }).click();
  await page.getByRole('heading', { name: 'Bienvenue' }).waitFor();
  check('déconnexion : retour à la connexion', true);
  await context.close();
  // The other managers free up Saint-Denis for the next run.
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
