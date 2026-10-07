import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/** Prefixes served by Nest itself: never redirected to the front end. */
const BACKEND_PATHS = ['/api', '/socket.io', '/health', '/docs'];

/**
 * In deployment (a single image), the API also serves the front-end build: same origin for
 * REST, the socket and the session cookie, like the Vite proxy locally. Without `dir`
 * (dev, tests), nothing changes.
 */
export function serveWeb(app: NestExpressApplication, dir: string | undefined): void {
  if (!dir) return;
  const index = join(dir, 'index.html');
  if (!existsSync(index)) throw new Error(`WEB_DIST_DIR sans index.html : ${dir}`);
  // The service worker and the manifest must be re-fetched on every visit so the PWA updates.
  app.useStaticAssets(dir, {
    index: false,
    setHeaders: (res, path) => {
      if (/(sw\.js|workbox-[^/]*\.js|\.webmanifest|index\.html)$/.test(path)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  });
  // Any other navigation falls back to the app (TanStack Router routes on the client side).
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isBackend = BACKEND_PATHS.some((p) => req.path === p || req.path.startsWith(`${p}/`));
    if (req.method !== 'GET' || isBackend) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}
