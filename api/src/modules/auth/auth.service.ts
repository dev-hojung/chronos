import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';

export type AuthProvider = 'apple' | 'google';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUserPayload {
  id: string;
  email: string | null;
  subscriptionTier: 'FREE' | 'PRO';
}

interface JwtAccessPayload {
  sub: string;
  tier: 'FREE' | 'PRO';
  typ: 'access';
}

interface JwtRefreshPayload {
  sub: string;
  typ: 'refresh';
}

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly appleJwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Verify an Apple identity token against Apple's JWKS.
   * Returns {sub, email} on success.
   */
  async verifyAppleIdToken(
    idToken: string,
    nonce?: string,
  ): Promise<{ sub: string; email: string | null }> {
    const audience = this.config.get<string>('APPLE_CLIENT_ID');
    if (!audience) {
      throw new InternalServerErrorException('APPLE_CLIENT_ID not configured');
    }

    try {
      const { payload } = await jwtVerify(idToken, this.appleJwks, {
        issuer: APPLE_ISSUER,
        audience,
      });

      if (nonce && payload.nonce && payload.nonce !== nonce) {
        throw new UnauthorizedException('Apple token nonce mismatch');
      }

      const sub = typeof payload.sub === 'string' ? payload.sub : null;
      if (!sub) throw new UnauthorizedException('Apple token missing sub');

      const email =
        typeof payload.email === 'string' ? payload.email : null;
      return { sub, email };
    } catch (err) {
      this.logger.warn(`Apple id token verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid Apple identity token');
    }
  }

  /**
   * Verify a Google ID token using google-auth-library.
   * Accepts any of the configured iOS/Android/Web client IDs as audience.
   */
  async verifyGoogleIdToken(
    idToken: string,
  ): Promise<{ sub: string; email: string | null }> {
    const audiences = [
      this.config.get<string>('GOOGLE_CLIENT_ID_IOS'),
      this.config.get<string>('GOOGLE_CLIENT_ID_ANDROID'),
      this.config.get<string>('GOOGLE_CLIENT_ID_WEB'),
    ].filter((a): a is string => typeof a === 'string' && a.length > 0);

    if (audiences.length === 0) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID_* not configured');
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Google token missing sub');
      }
      return { sub: payload.sub, email: payload.email ?? null };
    } catch (err) {
      this.logger.warn(`Google id token verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid Google identity token');
    }
  }

  /**
   * Find or create a user by provider sub. Returns the user shape used by the API.
   */
  async upsertUser(
    provider: AuthProvider,
    sub: string,
    email: string | null,
  ): Promise<AuthUserPayload> {
    const field = provider === 'apple' ? 'appleSub' : 'googleSub';

    // NOTE: requires DATABASE_URL at runtime; compile-time is safe.
    const existing = await this.prisma.user.findUnique({
      where: { [field]: sub } as any,
    });

    if (existing) {
      // Backfill email if missing and provider now exposes it.
      if (!existing.email && email) {
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: { email },
        });
        return this.toAuthUser(updated);
      }
      return this.toAuthUser(existing);
    }

    const created = await this.prisma.user.create({
      data: {
        email: email ?? undefined,
        [field]: sub,
      } as any,
    });
    return this.toAuthUser(created);
  }

  /**
   * Issue access + refresh JWTs for a user.
   */
  async issueTokens(user: AuthUserPayload): Promise<IssuedTokens> {
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      tier: user.subscriptionTier,
      typ: 'access',
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      typ: 'refresh',
    };

    const accessSecret = this.requireSecret('JWT_ACCESS_SECRET');
    const refreshSecret = this.requireSecret('JWT_REFRESH_SECRET');

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: accessSecret,
      expiresIn: ACCESS_TTL_SECONDS,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: refreshSecret,
      expiresIn: REFRESH_TTL_SECONDS,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL_SECONDS,
    };
  }

  /**
   * Verify a refresh token and return the userId.
   */
  async verifyRefresh(token: string): Promise<string> {
    const secret = this.requireSecret('JWT_REFRESH_SECRET');
    try {
      const payload = await this.jwt.verifyAsync<JwtRefreshPayload>(token, {
        secret,
      });
      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Not a refresh token');
      }
      return payload.sub;
    } catch (err) {
      this.logger.warn(`Refresh verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Rotate a refresh token: verify then issue a fresh pair.
   */
  async rotateRefresh(oldRefreshToken: string): Promise<IssuedTokens> {
    const userId = await this.verifyRefresh(oldRefreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.issueTokens(this.toAuthUser(user));
  }

  async getUserById(userId: string): Promise<AuthUserPayload | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? this.toAuthUser(user) : null;
  }

  /** Expo push token 등록 및 notification prefs 업데이트 */
  async updatePushToken(
    userId: string,
    token: string,
    notificationPrefs?: Record<string, boolean>,
  ): Promise<void> {
    const data: Record<string, unknown> = { expoPushToken: token };
    if (notificationPrefs !== undefined) {
      data['notificationPrefs'] = notificationPrefs;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: data as Parameters<typeof this.prisma.user.update>[0]['data'],
    });
  }

  private toAuthUser(user: {
    id: string;
    email: string | null;
    subscriptionTier: 'FREE' | 'PRO';
  }): AuthUserPayload {
    return {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    };
  }

  private requireSecret(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }
    return value;
  }
}
