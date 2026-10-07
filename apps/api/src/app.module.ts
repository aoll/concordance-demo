import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './auth/auth.module';
import { BusinessErrorFilter } from './common/errors';
import { RequestLogger } from './common/request-logger';
import { ConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PresencesModule } from './presences/presences.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule, AuthModule, ZonesModule, PresencesModule],
  providers: [
    // Inputs validated and outputs filtered by the DTOs' Zod schemas.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    // Business errors → ErrorResponse { statusCode, code, message }.
    { provide: APP_FILTER, useClass: BusinessErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLogger).forRoutes('*path');
  }
}
