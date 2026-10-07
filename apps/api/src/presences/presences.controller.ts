import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { ErrorResponseDto } from '../common/error.dto';
import {
  CreatePresenceDto,
  ListPresencesQueryDto,
  PresenceDto,
  UpdatePresenceDto,
} from './presences.dto';

@ApiTags('presences')
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('presences')
export class PresencesController {
  @Get()
  @ApiOperation({
    summary: 'Recherche de présences',
    description:
      "managerId + active=true : le shift en cours d'un manager. zoneId + active=true : qui est sur une zone.",
  })
  @ZodResponse({ status: 200, type: [PresenceDto] })
  listPresences(@Query() _query: ListPresencesQueryDto): PresenceDto[] {
    // Lot 3b.
    throw new NotImplementedException();
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
  createPresence(@Body() _body: CreatePresenceDto): PresenceDto {
    // Lot 3b : transaction avec SELECT … FOR UPDATE sur la zone.
    throw new NotImplementedException();
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
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() _body: UpdatePresenceDto,
  ): PresenceDto {
    throw new NotImplementedException();
  }
}
