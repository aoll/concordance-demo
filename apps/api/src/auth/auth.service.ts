import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { type Database, DB, one } from '../database/database.module';
import { type ManagerRow, managers } from '../database/schema';

/** Contenu du JWT de session : seulement l'id du manager. */
interface SessionToken {
  sub: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  /** Pas de mot de passe : le pseudo identifie le manager, créé au premier passage. */
  async login(displayName: string): Promise<{ manager: ManagerRow; token: string }> {
    await this.db.insert(managers).values({ displayName }).onConflictDoNothing();
    const manager = one(
      await this.db.select().from(managers).where(eq(managers.displayName, displayName)),
    );
    const token = await this.jwt.signAsync({ sub: manager.id } satisfies SessionToken);
    return { manager, token };
  }

  /** Manager du jeton, ou null si le jeton est absent, invalide, expiré ou orphelin. */
  async authenticate(token: string | undefined): Promise<ManagerRow | null> {
    if (!token) return null;
    const payload = await this.jwt.verifyAsync<SessionToken>(token).catch(() => null);
    if (!payload) return null;
    const [manager] = await this.db.select().from(managers).where(eq(managers.id, payload.sub));
    return manager ?? null;
  }
}
