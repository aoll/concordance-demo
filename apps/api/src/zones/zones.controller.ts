import { Controller, Get, NotImplementedException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ErrorResponseDto } from '../common/error.dto';
import { ZoneOccupancyDto } from './zones.dto';

@ApiTags('zones')
@Controller('zones')
export class ZonesController {
  @Get()
  @ApiOperation({ summary: 'Liste des zones avec leur occupation' })
  @ZodResponse({ status: 200, type: [ZoneOccupancyDto] })
  listZones(): ZoneOccupancyDto[] {
    // Lot 2a : lecture réelle en base.
    throw new NotImplementedException();
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une zone avec son occupation" })
  @ZodResponse({ status: 200, type: ZoneOccupancyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getZone(@Param('id', ParseUUIDPipe) _id: string): ZoneOccupancyDto {
    throw new NotImplementedException();
  }
}
