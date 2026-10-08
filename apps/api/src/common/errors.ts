import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorCode, ErrorResponseDto } from './error.dto';

/**
 * Business errors: services throw them without knowing anything about HTTP;
 * `BusinessErrorFilter` translates them into an `ErrorResponse` with the right status.
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

const STATUS: Record<ErrorCode, HttpStatus> = {
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  ZONE_FULL: HttpStatus.CONFLICT,
  ALREADY_PRESENT: HttpStatus.CONFLICT,
};

@Catch(BusinessError)
export class BusinessErrorFilter implements ExceptionFilter<BusinessError> {
  catch(error: BusinessError, host: ArgumentsHost): void {
    const statusCode = STATUS[error.code];
    const body: ErrorResponseDto = { statusCode, code: error.code, message: error.message };
    const response = host.switchToHttp().getResponse<Response>();
    // Read by RequestLogger to log the business code.
    response.locals.errorCode = error.code;
    response.status(statusCode).json(body);
  }
}
