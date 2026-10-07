import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './auth/auth.module';
import { BusinessErrorFilter } from './common/errors';
import { ConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PresencesModule } from './presences/presences.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule, AuthModule, ZonesModule, PresencesModule],
  providers: [
    // Entrées validées et sorties filtrées par les schémas Zod des DTO.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    // Erreurs métier → ErrorResponse { statusCode, code, message }.
    { provide: APP_FILTER, useClass: BusinessErrorFilter },
  ],
})
export class AppModule {}
