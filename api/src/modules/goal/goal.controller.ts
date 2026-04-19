import { Controller } from '@nestjs/common';
import { GoalService } from './goal.service';

// TODO W7-W8: GET /goals, POST /goals, GET /today (ranked), POST /goals/:id/contribute
@Controller('goals')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}
}
