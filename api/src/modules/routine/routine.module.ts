import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { RoutineWeeklyTask } from './routine-weekly.task';
import { AuditModule } from '../audit/audit.module';
import { GoalModule } from '../goal/goal.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule, GoalModule],
  controllers: [RoutineController],
  providers: [RoutineService, RoutineWeeklyTask],
  exports: [RoutineService],
})
export class RoutineModule {}
