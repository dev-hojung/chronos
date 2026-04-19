import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPrincipal } from './jwt.strategy';

/**
 * @CurrentUser() resolves the JwtPrincipal attached by JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPrincipal => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as JwtPrincipal;
  },
);
