import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PresencesController } from './presences.controller';
import { PresencesService } from './presences.service';

@Module({
  imports: [AuthModule],
  controllers: [PresencesController],
  providers: [PresencesService],
})
export class PresencesModule {}
