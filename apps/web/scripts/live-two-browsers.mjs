// Preuve du lot 5 : deux navigateurs côte à côte sur la vraie API (Nest + Postgres).
// Ce que fait l'un apparaît chez l'autre sans recharger la page, et sans refetch de GET /zones :
// l'événement socket.io est écrit directement dans le cache TanStack Query.
// Prérequis : Postgres du docker compose (pnpm db:up) et l'API buildée (pnpm build).
// Base dédiée concordance_proof, recréée à chaque run. Captures dans $PROOF_DIR (./live-proof).
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright-core';

const PROOF_DIR = process.env.PROOF_DIR ?? 'live-proof';
const PORT = 5175;
const APP = `http://localhost:${PORT}`;
const DB = 'concordance_proof';

const psql = (sql) =>
  execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'concordance', '-c', sql], {
    cwd: '../..',
    stdio: 'pipe',
  });
psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
psql(`CREATE DATABASE ${DB}`);

const waitFor = (child, text, name) =>
  new Promise((resolve, reject) => {
    const onData = (chunk) => chunk.toString().includes(text) && resolve();
    child.stdout.on('data', onData);
    // Les coupures de socket à la fermeture des navigateurs font râler le proxy de Vite : bruit.
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
// Arrêt garanti des deux serveurs, y compris si l'un ne démarre pas.
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

const check = (label, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});

/** Un navigateur isolé (cookies à part) connecté sous un pseudo. */
async function open(name, device, pseudo) {
  const context = await browser.newContext({ ...device, locale: 'fr-FR' });
  const page = await context.newPage();
  const zoneFetches = [];
  page.on('request', (r) => r.url().endsWith('/api/zones') && zoneFetches.push(Date.now()));
  let sockets = 0;
  page.on('websocket', (ws) => ws.url().includes('/socket.io/') && sockets++);
  const errors = [];
  // Le 401 de GET /auth/session avant connexion est attendu (« pas connecté »).
  page.on(
    'console',
    (m) => m.type() === 'error' && !m.text().includes('401') && errors.push(m.text()),
  );
  await page.goto(APP);
  await page.getByLabel('Pseudo').fill(pseudo);
  await page.getByRole('button', { name: 'Entrer' }).click();
  await page.getByTestId('count-Orly').waitFor();
  await page.getByTestId('live-status').and(page.locator('[data-status="live"]')).waitFor();
  return {
    name,
    page,
    panel: page.locator('aside.panel'),
    count: (zone) => page.getByTestId(`count-${zone}`),
    zone: (label) => page.getByRole('button', { name: new RegExp(`^${label},`) }),
    zoneFetches,
    sockets: () => sockets,
    errors,
    shot: (step) => page.screenshot({ path: `${PROOF_DIR}/${name}-${step}.png` }),
    close: () => context.close(),
  };
}

/** Les deux captures côte à côte dans une seule image, comme deux écrans posés sur la table. */
async function sideBySide(step, a, b) {
  await Promise.all([a.shot(step), b.shot(step)]);
  const src = async (who) =>
    `data:image/png;base64,${(await readFile(`${PROOF_DIR}/${who.name}-${step}.png`)).toString('base64')}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.setContent(`<body style="margin:0;display:flex;gap:24px;align-items:flex-start;
    padding:24px;background:#1d2524;font:600 16px system-ui;color:#fff">
    <figure style="margin:0"><figcaption>${a.name}</figcaption><img src="${await src(a)}" style="height:780px"></figure>
    <figure style="margin:0"><figcaption>${b.name}</figcaption><img src="${await src(b)}" style="height:780px"></figure>
    </body>`);
  await page.screenshot({ path: `${PROOF_DIR}/${step}-cote-a-cote.png`, fullPage: true });
  await page.close();
}

/** Aucun GET /zones pendant `during` : la mise à jour vient du WebSocket, pas d'un refetch. */
async function withoutRefetch(viewer, during) {
  const before = viewer.zoneFetches.length;
  await during();
  return viewer.zoneFetches.length === before;
}

try {
  await mkdir(PROOF_DIR, { recursive: true });
  const alex = await open('tablette-alex', devices['iPad Pro 11 landscape'], 'Alex L.');
  const kenza = await open('telephone-kenza', devices['Pixel 7'], 'Kenza A.');
  check('deux navigateurs connectés en WebSocket (pastille « en direct »)', true);
  check(
    'état initial lu sur la vraie API : La Défense 3/3, Orly 0/3',
    (await alex.count('La Défense').textContent()) === '3/3' &&
      (await kenza.count('Orly').textContent()) === '0/3',
  );
  await alex.zone('Orly').click();
  await sideBySide('1-depart', alex, kenza);

  // Kenza s'inscrit sur Orly depuis son téléphone : la tablette d'Alex suit.
  const noRefetch1 = await withoutRefetch(alex, async () => {
    await kenza.zone('Orly').click();
    await kenza.panel.getByRole('button', { name: "Je m'inscris ici" }).click();
    await alex.count('Orly').getByText('1/3').waitFor({ timeout: 3000 });
  });
  check('inscription de Kenza visible chez Alex sans recharger : Orly 1/3', true);
  check('… sans refetch de GET /api/zones chez Alex (setQueryData)', noRefetch1);
  check(
    '… panneau d’Alex : Kenza A. listée',
    await alex.panel.getByText('Kenza A.', { exact: true }).isVisible(),
  );
  check(
    "… fil d'activité d'Alex : « Kenza A. a rejoint Orly »",
    await alex.panel.getByText('Kenza A. a rejoint Orly').isVisible(),
  );
  check(
    '… flash sur la zone Orly',
    await alex.zone('Orly').evaluate((g) => g.classList.contains('flash')),
  );
  await sideBySide('2-kenza-inscrite', alex, kenza);

  // Alex rejoint Orly à son tour : le téléphone de Kenza suit.
  await alex.panel.getByRole('button', { name: "Je m'inscris ici" }).click();
  await kenza.count('Orly').getByText('2/3').waitFor({ timeout: 3000 });
  check(
    "inscription d'Alex visible chez Kenza : Orly 2/3, « Alex L. a rejoint Orly »",
    await kenza.panel.getByText('Alex L. a rejoint Orly').isVisible(),
  );
  await sideBySide('3-alex-inscrit', alex, kenza);

  // Kenza termine son shift : Orly redescend chez Alex.
  const noRefetch2 = await withoutRefetch(alex, async () => {
    await kenza.page.locator('.shift').getByRole('button', { name: 'Terminer mon shift' }).click();
    await alex.count('Orly').getByText('1/3').waitFor({ timeout: 3000 });
  });
  check('fin de shift de Kenza visible chez Alex : Orly 1/3, sans refetch', noRefetch2);
  check(
    "… fil d'activité : « Kenza A. a terminé son shift sur Orly »",
    await alex.panel.getByText('Kenza A. a terminé son shift sur Orly').isVisible(),
  );
  await sideBySide('4-fin-de-shift', alex, kenza);

  // Le cache nourri par les événements doit correspondre à ce que renvoie l'API au rechargement.
  const live = await kenza.count('Orly').textContent();
  await kenza.page.reload();
  await kenza.count('Orly').waitFor();
  check(
    `après rechargement, Kenza voit le même état que le direct (Orly ${live})`,
    (await kenza.count('Orly').textContent()) === live,
  );
  check('une seule connexion socket.io pour toute la session d’Alex', alex.sockets() === 1);
  const consoleErrors = [...alex.errors, ...kenza.errors];
  check(
    `aucune erreur dans la console des deux navigateurs${consoleErrors.length ? ` : ${consoleErrors.join(' | ')}` : ''}`,
    consoleErrors.length === 0,
  );

  await alex.close();
  await kenza.close();
} finally {
  await browser.close();
  process.exit();
}
