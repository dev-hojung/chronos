import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // DATABASE_URL may be absent in W2; connect lazily only if configured.
    if (!process.env.DATABASE_URL) {
      this.logger.warn(
        'DATABASE_URL not set — PrismaService will not connect (W2 dev mode).',
      );
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    await this.$disconnect();
  }
}
