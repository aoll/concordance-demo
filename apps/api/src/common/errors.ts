import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorCode, ErrorResponseDto } from './error.dto';

/**
 * Erreurs métier : les services les lèvent sans rien savoir de HTTP ;
 * `BusinessErrorFilter` les traduit en `ErrorResponse` avec le bon statut.
 */
export abstract class BusinessError extends Error {
  abstract readonly code: ErrorCode;
}

export class UnauthenticatedError extends BusinessError {
  readonly code = 'UNAUTHENTICATED';
  constructor() {
    super('Connectez-vous avec un pseudo.');
  }
}

export class ForbiddenError extends BusinessError {
  readonly code = 'FORBIDDEN';
}

export class NotFoundError extends BusinessError {
  readonly code = 'NOT_FOUND';
}

export class ZoneFullError extends BusinessError {
  readonly code = 'ZONE_FULL';
  constructor() {
    super('Cette zone est complète.');
  }
}

export class AlreadyPresentError extends BusinessError {
  readonly code = 'ALREADY_PRESENT';
  constructor() {
    super('Vous avez déjà un shift en cours.');
  }
}

export class PresenceAlreadyEndedError extends BusinessError {
  readonly code = 'PRESENCE_ALREADY_ENDED';
  constructor() {
    super('Ce shift est déjà terminé.');
  }
}

const STATUS: Record<ErrorCode, HttpStatus> = {
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  ZONE_FULL: HttpStatus.CONFLICT,
  ALREADY_PRESENT: HttpStatus.CONFLICT,
  PRESENCE_ALREADY_ENDED: HttpStatus.CONFLICT,
};

@Catch(BusinessError)
export class BusinessErrorFilter implements ExceptionFilter<BusinessError> {
  catch(error: BusinessError, host: ArgumentsHost): void {
    const statusCode = STATUS[error.code];
    const body: ErrorResponseDto = { statusCode, code: error.code, message: error.message };
    const response = host.switchToHttp().getResponse<Response>();
    // Lu par RequestLogger pour journaliser le code métier.
    response.locals.errorCode = error.code;
    response.status(statusCode).json(body);
  }
}
