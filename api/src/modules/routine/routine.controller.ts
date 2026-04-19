import { Controller } from '@nestjs/common';
import { RoutineService } from './routine.service';

// TODO W5-W6: GET /routines, POST /routines, POST /routines/:id/runs
@Controller('routines')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}
}
