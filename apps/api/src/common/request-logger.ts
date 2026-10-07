import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * One line per HTTP request: method, route, status, duration, and the business code when there is one
 * (set by `BusinessErrorFilter`). Middleware rather than interceptor: it also sees requests
 * rejected by a guard or by validation. In production, pino (nestjs-pino) would be plugged in here.
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
