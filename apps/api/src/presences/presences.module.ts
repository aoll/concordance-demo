import { Module } from '@nestjs/common';
import { PresencesController } from './presences.controller';

@Module({
  controllers: [PresencesController],
})
export class PresencesModule {}
