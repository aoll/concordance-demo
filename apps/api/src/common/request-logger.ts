import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Une ligne par requête HTTP : méthode, route, statut, durée, et le code métier quand il y en a un
 * (posé par `BusinessErrorFilter`). Middleware plutôt qu'intercepteur : il voit aussi les requêtes
 * refusées par un guard ou par la validation. En production, on brancherait pino (nestjs-pino) ici.
 */
@Injectable()
export class RequestLogger implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const start = performance.now();
    response.on('finish', () => {
      const ms = Math.round(performance.now() - start);
      const code = response.locals.errorCode ? ` ${response.locals.errorCode}` : '';
      const line = `${request.method} ${request.originalUrl} ${response.statusCode}${code} ${ms} ms`;
      if (response.statusCode >= 500) this.logger.error(line);
      else if (response.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });
    next();
  }
}
