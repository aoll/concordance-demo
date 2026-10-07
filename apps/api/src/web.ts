import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/** Préfixes servis par Nest lui-même : jamais renvoyés vers le front. */
const BACKEND_PATHS = ['/api', '/socket.io', '/health', '/docs'];

/**
 * En déploiement (une seule image), l'API sert aussi le build du front : même origine pour
 * le REST, la socket et le cookie de session, comme le proxy Vite en local. Sans `dir`
 * (dev, tests), rien ne change.
 */
export function serveWeb(app: NestExpressApplication, dir: string | undefined): void {
  if (!dir) return;
  const index = join(dir, 'index.html');
  if (!existsSync(index)) throw new Error(`WEB_DIST_DIR sans index.html : ${dir}`);
  // Le service worker et le manifest doivent être relus à chaque visite pour que la PWA se mette à jour.
  app.useStaticAssets(dir, {
    index: false,
    setHeaders: (res, path) => {
      if (/(sw\.js|workbox-[^/]*\.js|\.webmanifest|index\.html)$/.test(path)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  });
  // Toute autre navigation retombe sur l'appli (routes TanStack Router côté client).
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isBackend = BACKEND_PATHS.some((p) => req.path === p || req.path.startsWith(`${p}/`));
    if (req.method !== 'GET' || isBackend) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}
