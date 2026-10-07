// Preuve des lots 2 et 4 côté front : carte branchée sur les hooks Orval, inscription optimiste,
// rollback sur 409 ZONE_FULL, fin de shift, déconnexion. Tourne sur le faux back MSW (écritures
// ralenties de 600 ms pour voir l'optimisme), en téléphone puis en tablette.
// Captures dans $PROOF_DIR (par défaut ./front-proof).
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium, devices } from 'playwright-core';

const PROOF_DIR = process.env.PROOF_DIR ?? 'front-proof';
const PORT = 5174;
const APP = `http://localhost:${PORT}`;

const vite = spawn('node_modules/.bin/vite', ['--port', String(PORT), '--strictPort'], {
  stdio: 'pipe',
  env: { ...process.env, VITE_API_MOCKS: 'true' },
});
await new Promise((resolve, reject) => {
  vite.stdout.on('data', (chunk) => chunk.toString().includes(String(PORT)) && resolve());
  vite.on('exit', (code) => reject(new Error(`vite arrêté (${code})`)));
});

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
  const shot = (step) => page.screenshot({ path: `${PROOF_DIR}/${name}-${step}.png` });
  const count = (slug) => page.getByTestId(`count-${slug}`);
  const zone = (label) => page.getByRole('button', { name: new RegExp(`^${label},`) });
  const panel = page.locator('aside.panel');

  await page.goto(APP);
  await page.getByRole('heading', { name: 'Bienvenue' }).waitFor();
  check('écran de connexion par pseudo', true);
  await shot('1-connexion');

  await page.getByLabel('Pseudo').fill('Alex L.');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await count('la-defense').getByText('3/3').waitFor();
  check(
    'carte : occupation lue via useListZones (La Défense 3/3, Paris rive gauche 5/6)',
    (await count('paris-rive-gauche').textContent()) === '5/6',
  );
  check(
    'carte : La Défense complète (hachures)',
    (await page.locator('#la-defense .hatch').count()) === 1,
  );
  await shot('2-carte');

  // Inscription optimiste sur Orly : le compteur bouge avant la réponse (600 ms).
  await zone('Orly').click();
  check(
    'panneau : Orly sélectionnée',
    await panel.getByRole('heading', { name: 'Orly' }).isVisible(),
  );
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/presences') && r.request().method() === 'POST',
  );
  const clickedAt = Date.now();
  await panel.getByRole('button', { name: "Je m'inscris ici" }).click();
  await count('orly').getByText('1/3').waitFor({ timeout: 300 });
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
  await count('orly').getByText('0/3').waitFor({ timeout: 300 });
  await page.locator('.shift').waitFor({ state: 'detached' });
  check('fin de shift : Orly revient à 0/3 et le bandeau disparaît', true);

  // Course perdue : Saint-Denis semble libre (1/4 en cache) mais d'autres l'ont remplie.
  // On attend d'abord la resynchronisation de la fin de shift (bouton réactivé).
  const joinButton = panel.getByRole('button', { name: "Je m'inscris ici" });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('aside.panel button')].at(-1);
    return button && !button.disabled;
  });
  await page.evaluate(() => {
    for (const who of ['Rachid A.', 'Camille J.', 'Lucas H.']) {
      window.concordanceMocks?.occupy('saint-denis', who);
    }
  });
  check('cache encore à 1/4 (staleTime)', (await count('saint-denis').textContent()) === '1/4');
  await joinButton.click();
  await count('saint-denis').getByText('2/4').waitFor({ timeout: 300 });
  check('optimiste : 2/4 affiché avant la réponse', true);
  await panel.getByRole('alert').getByText("vient d'être complétée").waitFor();
  check('409 ZONE_FULL : message clair', true);
  await count('saint-denis').getByText('4/4').waitFor();
  check(
    'rollback puis resynchronisation : Saint-Denis 4/4, pas de shift',
    (await page.locator('.shift').count()) === 0,
  );
  await shot('4-zone-pleine');

  // Déconnexion : retour à l'écran de connexion, cache hors ligne vidé.
  await page.getByRole('button', { name: /Déconnecter/ }).click();
  await page.getByRole('heading', { name: 'Bienvenue' }).waitFor();
  check('déconnexion : retour à la connexion', true);
  await context.close();
}

try {
  await mkdir(PROOF_DIR, { recursive: true });
  await run('telephone', devices['Pixel 7']);
  await run('tablette', devices['iPad Pro 11 landscape']);
} finally {
  await browser.close();
  vite.kill();
}
