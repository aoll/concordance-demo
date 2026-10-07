import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ZonesModule } from '../zones/zones.module';
import { PresenceGateway } from './presence.gateway';
import { PresencesController } from './presences.controller';
import { PresencesService } from './presences.service';

@Module({
  imports: [AuthModule, ZonesModule],
  controllers: [PresencesController],
  providers: [PresencesService, PresenceGateway],
})
export class PresencesModule {}
