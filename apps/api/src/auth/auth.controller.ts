import { Body, Controller, Get, HttpCode, NotImplementedException, Post } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ErrorResponseDto } from '../common/error.dto';
import { LoginDto, SessionDto } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({
    summary: 'Connexion par pseudo',
    description: 'Crée le manager au premier passage et pose un cookie de session (JWT signé).',
  })
  @ZodResponse({ status: 200, type: SessionDto })
  login(@Body() _body: LoginDto): SessionDto {
    // Lot 3a.
    throw new NotImplementedException();
  }

  @Get('session')
  @ApiOperation({ summary: 'Manager de la session courante (lu dans le cookie)' })
  @ZodResponse({ status: 200, type: SessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  getSession(): SessionDto {
    throw new NotImplementedException();
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Déconnexion (efface le cookie)' })
  @ApiNoContentResponse()
  logout(): void {
    throw new NotImplementedException();
  }
}
