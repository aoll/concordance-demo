import { Body, Controller, Get, HttpCode, Inject, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { ErrorResponseDto } from '../common/error.dto';
import { toManager } from '../common/manager.mapper';
import { APP_CONFIG, type AppConfig } from '../config';
import type { ManagerRow } from '../database/schema';
import { LoginDto, SessionDto } from './auth.dto';
import { AuthGuard, CurrentManager, SESSION_COOKIE } from './auth.guard';
import { AuthService } from './auth.service';

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Connexion par pseudo',
    description: 'Crée le manager au premier passage et pose un cookie de session (JWT signé).',
  })
  @ZodResponse({ status: 200, type: SessionDto })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionDto> {
    const { manager, token } = await this.auth.login(body.displayName);
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_MS,
    });
    return { manager: toManager(manager) };
  }

  @Get('session')
  @ApiOperation({ summary: 'Manager de la session courante (lu dans le cookie)' })
  @ZodResponse({ status: 200, type: SessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @UseGuards(AuthGuard)
  getSession(@CurrentManager() manager: ManagerRow): SessionDto {
    return { manager: toManager(manager) };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Déconnexion (efface le cookie)' })
  @ApiNoContentResponse()
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE);
  }
}
