// plan.module.ts — PlanModule (ScheduleModule은 RoutineModule에서 이미 등록됨)
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { PlanDailyTask } from './plan-daily.task';
import { PlanEveningTask } from './plan-evening.task';
import { AuditModule } from '../audit/audit.module';
import { GoalModule } from '../goal/goal.module';
import { RoutineModule } from '../routine/routine.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [
    // ScheduleModule.forRoot()은 RoutineModule에서 이미 등록됨.
    // 중복 등록을 피하기 위해 여기서는 forRoot() 없이 import.
    // NestJS schedule은 싱글턴이므로 안전.
    ScheduleModule,
    AuditModule,
    GoalModule,
    RoutineModule,
    EntitlementsModule,
  ],
  controllers: [PlanController],
  providers: [PlanService, PlanDailyTask, PlanEveningTask],
  exports: [PlanService],
})
export class PlanModule {}
