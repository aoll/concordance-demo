import { Controller, Get, Inject } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { type Database, DB } from '../database/database.module';

/** Sonde pour l'orchestrateur, hors contrat du front : `GET /health` (sans préfixe /api). */
@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    @Inject(DB) private readonly db: Database,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        const database = this.indicator.check('database');
        try {
          await this.db.execute(sql`select 1`);
          return database.up();
        } catch (error) {
          return database.down({ message: (error as Error).message });
        }
      },
    ]);
  }
}
