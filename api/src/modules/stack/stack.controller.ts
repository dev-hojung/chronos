import { Controller } from '@nestjs/common';
import { StackService } from './stack.service';

// TODO W3-W4: GET /stacks, POST /inbox, POST /stacks/cluster (AI trigger)
@Controller('stacks')
export class StackController {
  constructor(private readonly stackService: StackService) {}
}
