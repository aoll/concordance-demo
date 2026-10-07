import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ErrorResponseDto } from '../common/error.dto';
import { ZoneOccupancyDto } from './zones.dto';
import { ZonesService } from './zones.service';

@ApiTags('zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des zones avec leur occupation' })
  @ZodResponse({ status: 200, type: [ZoneOccupancyDto] })
  listZones(): Promise<ZoneOccupancyDto[]> {
    return this.zones.list();
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une zone avec son occupation" })
  @ZodResponse({ status: 200, type: ZoneOccupancyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getZone(@Param('id', ParseUUIDPipe) id: string): Promise<ZoneOccupancyDto> {
    return this.zones.get(id);
  }
}
