import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { StackModule } from './modules/stack/stack.module';
import { RoutineModule } from './modules/routine/routine.module';
import { GoalModule } from './modules/goal/goal.module';
import { AiModule } from './modules/ai/ai.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    HealthModule,
    AuthModule,
    StackModule,
    RoutineModule,
    GoalModule,
    AiModule,
    EntitlementsModule,
    AuditModule,
  ],
})
export class AppModule {}
