// Proof for lot 6: the app is installable and reopens in airplane mode with the last known occupancy.
// Prerequisites: `pnpm --filter @concordance/web build`. Starts a fake back end on :3000, `vite preview` on :4173,
// then a mobile Chromium driven by Playwright. Screenshots in $PROOF_DIR (default ./pwa-proof).
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, devices } from 'playwright-core';

const PROOF_DIR = process.env.PROOF_DIR ?? 'pwa-proof';
const APP = 'http://localhost:4173';

// Frozen occupancy taken from the mockup, in the contract's ZoneOccupancy format. The outline is a
// simple disc around the label: this proof is about offline mode, not about the map.
const disc = (x, y) => `M${x - 50},${y + 20} a50,50 0 1,0 100,0 a50,50 0 1,0 -100,0 Z`;
const zones = [
  ['Paris rive droite', 6, [472, 256], ['Karim B.', 'Sophie T.', 'Julien R.']],
  ['Paris rive gauche', 6, [372, 338], ['Nadia K.', 'Thomas G.', 'Léa M.', 'Hugo P.', 'Inès D.']],
  ['La Défense', 3, [256, 226], ['Marc V.', 'Claire F.', 'Yanis O.']],
  ['Saint-Denis', 4, [402, 140], ['Fatou S.']],
  ['Marne-la-Vallée', 4, [640, 266], ['Paul N.', 'Emma C.']],
  ['Orly', 3, [428, 486], []],
].map(([name, capacity, [x, y], names]) => ({
  id: crypto.randomUUID(),
  name,
  capacity,
  shape: { path: disc(x, y), label: { x, y } },
  occupied: names.length,
  managers: names.map((displayName) => ({ id: crypto.randomUUID(), displayName })),
}));

// The app only shows the map to a logged-in manager, with no shift in progress here.
const routes = {
  '/api/zones': zones,
  '/api/auth/session': { manager: { id: crypto.randomUUID(), displayName: 'Alex L.' } },
};
const api = createServer((req, res) => {
  const path = req.url?.split('?')[0] ?? '';
  const body = path === '/api/presences' ? [] : routes[path];
  if (req.method === 'GET' && body) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
    return;
  }
  res.writeHead(404).end();
});
await new Promise((resolve) => api.listen(3000, resolve));

const preview = spawn('node_modules/.bin/vite', ['preview', '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  preview.stdout.on('data', (chunk) => chunk.toString().includes('4173') && resolve());
  preview.on('exit', (code) => reject(new Error(`vite preview arrêté (${code})`)));
});

const check = (label, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
};

// Persistent profile: Chromium refuses installation in incognito mode.
const profile = await mkdtemp(join(tmpdir(), 'pwa-proof-'));
const context = await chromium.launchPersistentContext(profile, {
  ...devices['Pixel 7'],
  locale: 'fr-FR',
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
try {
  await mkdir(PROOF_DIR, { recursive: true });
  const page = context.pages()[0] ?? (await context.newPage());
  const cdp = await context.newCDPSession(page);

  // 1. Online: first load, the service worker installs and takes control.
  await page.goto(APP);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const count = (zone) => page.getByTestId(`count-${zone}`);
  await count('La Défense').getByText('3/3').waitFor();
  check(
    'service worker actif et contrôlant la page',
    await page.evaluate(() => navigator.serviceWorker.controller?.state === 'activated'),
  );

  const manifest = await cdp.send('Page.getAppManifest');
  check(`manifest servi (${manifest.url})`, manifest.errors.length === 0 && Boolean(manifest.data));
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  check(
    `installable selon Chromium (erreurs : ${JSON.stringify(installabilityErrors)})`,
    installabilityErrors.length === 0,
  );
  await page.screenshot({ path: `${PROOF_DIR}/1-en-ligne.png` });

  // Lets the persister (1 s throttle) write the TanStack Query cache to IndexedDB.
  await page.waitForTimeout(1500);
  check(
    'cache TanStack Query persisté dans IndexedDB',
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const open = indexedDB.open('keyval-store');
          open.onsuccess = () => {
            const get = open.result
              .transaction('keyval')
              .objectStore('keyval')
              .get('concordance-query-cache');
            get.onsuccess = () =>
              resolve(typeof get.result === 'string' && get.result.includes('La Défense'));
          };
          open.onerror = () => resolve(false);
        }),
    ),
  );

  // 2. Airplane mode: no network or API, we reopen the app.
  api.close();
  await context.setOffline(true);
  await page.reload();
  await count('La Défense').getByText('3/3').waitFor({ timeout: 5000 });
  check('hors ligne : la page se recharge depuis le shell en cache', true);
  check(
    'hors ligne : dernière occupation connue affichée',
    (await count('Paris rive gauche').textContent()) === '5/6',
  );
  check(
    'hors ligne : bandeau visible',
    await page.getByRole('status').getByText('Hors ligne').isVisible(),
  );
  await page.screenshot({ path: `${PROOF_DIR}/2-mode-avion.png` });

  // 3. Network is back: the banner disappears.
  await context.setOffline(false);
  await page.getByRole('status').filter({ hasText: 'Hors ligne' }).waitFor({ state: 'detached' });
  check('retour en ligne : bandeau masqué', true);
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
  preview.kill();
  api.close();
}
