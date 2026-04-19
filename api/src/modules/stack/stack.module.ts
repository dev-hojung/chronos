import { Module } from '@nestjs/common';
import { StackController } from './stack.controller';
import { StackService } from './stack.service';
import { AuditModule } from '../audit/audit.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [AuditModule, EntitlementsModule],
  controllers: [StackController],
  providers: [StackService],
})
export class StackModule {}
