import { Controller } from '@nestjs/common';
import { AiService } from './ai.service';

// TODO W4+: POST /ai/execute — Claude Sonnet 4.5 proxy with tool-use
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}
}
