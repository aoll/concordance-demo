import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, login, resetDatabase, type TestApp } from '../test/test-app';

describe('auth par pseudo (lot 3a)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.db);
  });

  afterAll(() => t.app.close());

  it('pose un cookie httpOnly et crée le manager au premier passage seulement', async () => {
    const response = await t.http().post('/api/auth/login').send({ displayName: 'Alex' });
    expect(response.status).toBe(200);
    expect(String(response.headers['set-cookie'])).toMatch(/concordance_session=.+HttpOnly/);
    const again = await login(t.http, 'Alex');
    expect(again.manager).toEqual(response.body.manager);
  });

  it('GET /api/auth/session renvoie le manager du cookie', async () => {
    const { manager, cookie } = await login(t.http, 'Alex');
    const response = await t.http().get('/api/auth/session').set('Cookie', cookie).expect(200);
    expect(response.body).toEqual({ manager });
  });

  it('401 UNAUTHENTICATED sans cookie ou avec un jeton invalide', async () => {
    const none = await t.http().get('/api/auth/session').expect(401);
    expect(none.body).toEqual({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: expect.any(String),
    });
    await t.http().get('/api/auth/session').set('Cookie', 'concordance_session=faux').expect(401);
  });

  it('POST /api/auth/logout efface le cookie', async () => {
    const response = await t.http().post('/api/auth/logout').expect(204);
    expect(String(response.headers['set-cookie'])).toMatch(/concordance_session=;/);
  });
});
