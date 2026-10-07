import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeOpenApi } from './openapi';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const document = configureApp(app);
  SwaggerModule.setup('docs', app, document);
  if (process.env.NODE_ENV !== 'production') {
    // En dev, chaque redémarrage réécrit le contrat ; `orval --watch` régénère le client.
    await writeOpenApi(document);
  }
  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`API prête sur http://localhost:${port}/api (Swagger : /docs)`);
}

void bootstrap();
