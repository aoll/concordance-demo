import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import type { ManagerRow } from '../managers/managers.schema';
import {
  CreatePresenceDto,
  ListPresencesQueryDto,
  PresenceDto,
  PresenceStatusDto,
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

  @Put(':id/status')
  @ApiOperation({
    summary: 'Terminer un shift',
    description:
      'Idempotent : rejouer la requête sur un shift déjà terminé renvoie 200 et la même présence.',
  })
  @ZodResponse({ status: 200, type: PresenceDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'La présence appartient à un autre manager (FORBIDDEN)',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  setPresenceStatus(
    @CurrentManager() manager: ManagerRow,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: PresenceStatusDto,
  ): Promise<PresenceDto> {
    // Only status accepted by the contract: ENDED.
    return this.presences.end(manager, id);
  }
}
