import { Controller } from '@nestjs/common';
import { AuditService } from './audit.service';

// TODO W4+: GET /audit (timeline), POST /audit/:id/undo
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}
}
