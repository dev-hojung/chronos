import { Module } from '@nestjs/common';
import { StackController } from './stack.controller';
import { StackService } from './stack.service';

// TODO W3-W4: Inbox CRUD + Claude cluster_inbox tool-use + undo
@Module({
  controllers: [StackController],
  providers: [StackService],
})
export class StackModule {}
