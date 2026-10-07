import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { type Database, DB, one } from '../database/database.module';
import { type ManagerRow, managers } from '../managers/managers.schema';

/** Session JWT payload: only the manager's id. */
interface SessionToken {
  sub: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  /** No password: the username identifies the manager, created on first visit. */
  async login(displayName: string): Promise<{ manager: ManagerRow; token: string }> {
    await this.db.insert(managers).values({ displayName }).onConflictDoNothing();
    const manager = one(
      await this.db.select().from(managers).where(eq(managers.displayName, displayName)),
    );
    const token = await this.jwt.signAsync({ sub: manager.id } satisfies SessionToken);
    return { manager, token };
  }

  /** Manager for the token, or null if the token is missing, invalid, expired or orphaned. */
  async authenticate(token: string | undefined): Promise<ManagerRow | null> {
    if (!token) return null;
    const payload = await this.jwt.verifyAsync<SessionToken>(token).catch(() => null);
    if (!payload) return null;
    const [manager] = await this.db.select().from(managers).where(eq(managers.id, payload.sub));
    return manager ?? null;
  }
}
