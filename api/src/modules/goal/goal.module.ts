import { Module } from '@nestjs/common';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';

// TODO W7-W8: Goal CRUD + contributions + rank_today_with_gravity
@Module({
  controllers: [GoalController],
  providers: [GoalService],
})
export class GoalModule {}
