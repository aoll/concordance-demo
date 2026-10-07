import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';

export const OPENAPI_PATH = join(__dirname, '..', 'openapi.json');

/** Écrit le contrat seulement s'il a changé, pour ne pas relancer Orval pour rien. */
export async function writeOpenApi(document: OpenAPIObject): Promise<void> {
  const next = `${JSON.stringify(document, null, 2)}\n`;
  const current = await readFile(OPENAPI_PATH, 'utf8').catch(() => '');
  if (current !== next) await writeFile(OPENAPI_PATH, next);
}
