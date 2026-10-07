import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { UnauthenticatedError } from '../common/errors';
import type { ManagerRow } from '../managers/managers.schema';
import { AuthService } from './auth.service';

export const SESSION_COOKIE = 'concordance_session';

type AuthenticatedRequest = Request & { manager?: ManagerRow };

/** Reads the session cookie and attaches the manager to the request; otherwise 401 UNAUTHENTICATED. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const manager = await this.auth.authenticate(request.cookies?.[SESSION_COOKIE]);
    if (!manager) throw new UnauthenticatedError();
    request.manager = manager;
    return true;
  }
}

/** The logged-in manager, set by `AuthGuard`. */
export const CurrentManager = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ManagerRow => {
    const manager = context.switchToHttp().getRequest<AuthenticatedRequest>().manager;
    if (!manager) throw new UnauthenticatedError();
    return manager;
  },
);
