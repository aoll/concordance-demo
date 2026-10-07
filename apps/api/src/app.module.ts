import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './auth/auth.module';
import { PresencesModule } from './presences/presences.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [AuthModule, ZonesModule, PresencesModule],
  providers: [
    // Entrées validées et sorties filtrées par les schémas Zod des DTO.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
