import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { AuthGuard, CurrentManager } from '../auth/auth.guard';
import { ErrorResponseDto } from '../common/error.dto';
import type { ManagerRow } from '../database/schema';
import {
  CreatePresenceDto,
  ListPresencesQueryDto,
  PresenceDto,
  UpdatePresenceDto,
} from './presences.dto';
import { PresencesService } from './presences.service';

@ApiTags('presences')
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@UseGuards(AuthGuard)
@Controller('presences')
export class PresencesController {
  constructor(private readonly presences: PresencesService) {}

  @Get()
  @ApiOperation({
    summary: 'Recherche de présences',
    description:
      "managerId + active=true : le shift en cours d'un manager. zoneId + active=true : qui est sur une zone.",
  })
  @ZodResponse({ status: 200, type: [PresenceDto] })
  listPresences(@Query() query: ListPresencesQueryDto): Promise<PresenceDto[]> {
    return this.presences.list(query);
  }

  @Post()
  @ApiOperation({ summary: "S'inscrire sur une zone (début de shift)" })
  @ZodResponse({ status: 201, type: PresenceDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Zone inconnue (NOT_FOUND)' })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description:
      'ZONE_FULL : zone complète. ALREADY_PRESENT : le manager a déjà un shift en cours.',
  })
  createPresence(
    @CurrentManager() manager: ManagerRow,
    @Body() body: CreatePresenceDto,
  ): Promise<PresenceDto> {
    return this.presences.create(manager, body.zoneId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Terminer un shift' })
  @ZodResponse({ status: 200, type: PresenceDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'La présence appartient à un autre manager (FORBIDDEN)',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'PRESENCE_ALREADY_ENDED' })
  updatePresence(
    @CurrentManager() manager: ManagerRow,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: UpdatePresenceDto,
  ): Promise<PresenceDto> {
    // Seul statut accepté par le contrat : ENDED.
    return this.presences.end(manager, id);
  }
}
