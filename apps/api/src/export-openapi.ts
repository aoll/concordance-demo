import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OPENAPI_PATH, writeOpenApi } from './openapi';
import { configureApp } from './setup';

// `pnpm generate`: contract export without starting the server or touching the database.
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await writeOpenApi(configureApp(app));
  await app.close();
  console.log(`Contrat écrit dans ${OPENAPI_PATH}`);
}

void main();
