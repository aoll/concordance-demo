import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { configureApp } from './setup';

/**
 * Contrat de la tâche C : les routes et les schémas que le front consomme via Orval.
 * Les lots suivants remplacent les stubs (501) sans changer ces signatures.
 */
describe('contrat API', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    document = configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('expose les opérations attendues', () => {
    const operations = Object.entries(document.paths).flatMap(([path, item]) =>
      Object.entries(item).map(
        ([method, operation]) =>
          `${method.toUpperCase()} ${path} ${(operation as { operationId: string }).operationId}`,
      ),
    );
    expect(operations.sort()).toEqual(
      [
        'GET /api/auth/session getSession',
        'GET /api/presences listPresences',
        'GET /api/zones listZones',
        'GET /api/zones/{id} getZone',
        'PATCH /api/presences/{id} updatePresence',
        'POST /api/auth/login login',
        'POST /api/auth/logout logout',
        'POST /api/presences createPresence',
      ].sort(),
    );
  });

  it('nomme les schémas sans suffixe technique', () => {
    expect(Object.keys(document.components?.schemas ?? {}).sort()).toEqual(
      [
        'CreatePresence',
        'ErrorResponse',
        'Login',
        'Manager',
        'Presence',
        'Session',
        'UpdatePresence',
        'ZoneOccupancy',
      ].sort(),
    );
  });

  it('ne publie que les champs publics du manager', () => {
    const manager = document.components?.schemas?.Manager as { properties: object };
    expect(Object.keys(manager.properties).sort()).toEqual(['displayName', 'id']);
  });

  it('valide les entrées avant le contrôleur (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/presences')
      .send({ zoneId: 'pas-un-uuid' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/presences/3f1c1f3e-8a51-4c7b-9a43-0d6c1d1e2f10')
      .send({ status: 'ACTIVE' })
      .expect(400);
  });

  it('répond 501 tant que les stubs ne sont pas implémentés', async () => {
    await request(app.getHttpServer()).get('/api/zones').expect(501);
  });
});
