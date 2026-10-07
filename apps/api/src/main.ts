import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './config';
import { type Database, DB } from './database/database.module';
import { migrateDatabase, seedDatabase } from './database/migrate';
import { writeOpenApi } from './openapi';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  const port = app.get<AppConfig>(APP_CONFIG).API_PORT;
  await app.listen(port);
  console.log(`API prête sur http://localhost:${port}/api (Swagger : /docs)`);
}

void bootstrap();
