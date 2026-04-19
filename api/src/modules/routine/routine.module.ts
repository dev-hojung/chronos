import { Module } from '@nestjs/common';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';

// TODO W5-W6: Routine CRUD + weekly analysis cron + propose_routine_adjustment
@Module({
  controllers: [RoutineController],
  providers: [RoutineService],
})
export class RoutineModule {}
