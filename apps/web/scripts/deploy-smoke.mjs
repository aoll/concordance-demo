// Deployment check (Railway or local Docker image): two devices, one URL.
// APP_URL=https://… pnpm --filter @concordance/web proof:deploy
// Creates two test managers and leaves their shifts ended.
import { mkdir } from 'node:fs/promises';
import { chromium, devices } from 'playwright-core';

const APP = process.env.APP_URL ?? 'http://localhost:8080';
const PROOF_DIR = process.env.PROOF_DIR ?? 'deploy-proof';
const run = Date.now().toString(36).slice(-4);

const check = (label, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) process.exitCode = 1;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});

async function open(name, device, pseudo) {
  const context = await browser.newContext({ ...device, locale: 'fr-FR' });
  const page = await context.newPage();
  await page.goto(APP);
  await page.getByLabel('Pseudo').fill(pseudo);
  await page.getByRole('button', { name: 'Entrer' }).click();
  await page.getByTestId('count-Orly').waitFor();
  await page.getByTestId('live-status').and(page.locator('[data-status="live"]')).waitFor();
  return { name, page, count: (zone) => page.getByTestId(`count-${zone}`), context };
}

try {
  await mkdir(PROOF_DIR, { recursive: true });
  const tablet = await open('tablette', devices['iPad Pro 11 landscape'], `Test T${run}`);
  const phone = await open('telephone', devices['Pixel 7'], `Test P${run}`);
  check(`${APP} : connexion par pseudo et socket « en direct » sur les deux appareils`, true);

  const before = Number((await tablet.count('Orly').textContent()).split('/')[0]);
  await phone.page.getByRole('button', { name: /^Orly,/ }).click();
  await phone.page.getByRole('button', { name: "Je m'inscris ici" }).click();
  await tablet
    .count('Orly')
    .getByText(`${before + 1}/3`)
    .waitFor({ timeout: 5000 });
  check(`inscription du téléphone vue en direct sur la tablette (Orly ${before + 1}/3)`, true);
  await Promise.all([
    tablet.page.screenshot({ path: `${PROOF_DIR}/tablette.png` }),
    phone.page.screenshot({ path: `${PROOF_DIR}/telephone.png` }),
  ]);
  await phone.page.locator('.shift').getByRole('button', { name: 'Terminer mon shift' }).click();
  await tablet.count('Orly').getByText(`${before}/3`).waitFor({ timeout: 5000 });
  check(`fin de shift vue en direct (Orly ${before}/3)`, true);

  const sw = await phone.page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.state;
  });
  check(`service worker de la PWA actif (${sw})`, sw === 'activated');
  await phone.context.setOffline(true);
  await phone.page.reload();
  await phone.page.getByTestId('count-Orly').waitFor();
  check('hors ligne, la carte se recharge depuis le cache', true);
} finally {
  await browser.close();
  process.exit();
}
