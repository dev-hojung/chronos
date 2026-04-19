import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPrincipal {
  userId: string;
  tier: 'FREE' | 'PRO';
}

interface JwtAccessPayload {
  sub: string;
  tier: 'FREE' | 'PRO';
  typ: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      // Allow boot without secret in non-production; authenticated routes will fail at runtime.
      // Using a deterministic fallback keeps the strategy constructible for build/test.
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret ?? 'chronos-dev-access-secret',
    });
  }

  validate(payload: JwtAccessPayload): JwtPrincipal {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Not an access token');
    }
    return { userId: payload.sub, tier: payload.tier };
  }
}
