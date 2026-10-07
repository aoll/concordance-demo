import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './config';
import { type Database, DB } from './database/database.module';
import { migrateDatabase, seedDatabase } from './database/migrate';
import { writeOpenApi } from './openapi';
import { configureApp } from './setup';
import { serveWeb } from './web';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  // Démo : migrations et seed idempotents au démarrage, pour que `pnpm dev` suffise.
  const db = app.get<Database>(DB);
  await migrateDatabase(db);
  await seedDatabase(db);
  const document = configureApp(app);
  SwaggerModule.setup('docs', app, document);
  if (process.env.NODE_ENV !== 'production') {
    // En dev, chaque redémarrage réécrit le contrat ; `orval --watch` régénère le client.
    await writeOpenApi(document);
  }
  const config = app.get<AppConfig>(APP_CONFIG);
  serveWeb(app, config.WEB_DIST_DIR);
  const port = config.API_PORT;
  await app.listen(port);
  console.log(`API prête sur http://localhost:${port}/api (Swagger : /docs)`);
}

void bootstrap();
