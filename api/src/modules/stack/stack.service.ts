import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateInboxItemDto } from './dto/create-inbox-item.dto';
import { ListInboxDto } from './dto/list-inbox.dto';
import { CreateStackDto } from './dto/create-stack.dto';

@Injectable()
export class StackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Inbox ──────────────────────────────────────────────────────────────

  async createInboxItem(userId: string, dto: CreateInboxItemDto) {
    const item = await this.prisma.inboxItem.create({
      data: { userId, rawText: dto.rawText, source: dto.source },
    });
    await this.auditService.record(userId, 'inbox.create', { itemId: item.id });
    return item;
  }

  async listInbox(userId: string, query: ListInboxDto) {
    const { cursor, limit } = query;
    const items = await this.prisma.inboxItem.findMany({
      where: { userId, processedStackId: null },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    return {
      items: data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async deleteInboxItem(userId: string, id: string) {
    const item = await this.prisma.inboxItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('InboxItem not found');
    if (item.userId !== userId) throw new ForbiddenException();
    await this.prisma.inboxItem.delete({ where: { id } });
    await this.auditService.record(userId, 'inbox.delete', {
      item: {
        id: item.id,
        rawText: item.rawText,
        source: item.source,
        createdAt: item.createdAt.toISOString(),
      },
    });
    return { deleted: true };
  }

  // ── Stacks ─────────────────────────────────────────────────────────────

  async listStacks(userId: string) {
    return this.prisma.stack.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async getStack(userId: string, id: string) {
    const stack = await this.prisma.stack.findUnique({
      where: { id },
      include: {
        items: {
          include: { inboxItem: true },
          orderBy: { orderIdx: 'asc' },
        },
        nextActions: { orderBy: { priority: 'asc' } },
      },
    });
    if (!stack) throw new NotFoundException('Stack not found');
    if (stack.userId !== userId) throw new ForbiddenException();
    return stack;
  }

  async createManualStack(userId: string, dto: CreateStackDto) {
    const stack = await this.prisma.stack.create({
      data: {
        userId,
        title: dto.title,
        contextLabel: dto.contextLabel,
        summary: dto.summary,
        aiGenerated: false,
      },
    });

    if (dto.itemIds?.length) {
      await this._bindItems(userId, stack.id, dto.itemIds);
    }

    await this.auditService.record(userId, 'stack.create', {
      stackId: stack.id,
      itemIds: dto.itemIds ?? [],
    });
    return stack;
  }

  async addItemsToStack(userId: string, stackId: string, itemIds: string[]) {
    const stack = await this._requireStack(userId, stackId);
    await this._bindItems(userId, stack.id, itemIds);
    await this.auditService.record(userId, 'stack.addItems', { stackId, itemIds });
    return { added: itemIds.length };
  }

  async removeItem(userId: string, stackId: string, itemId: string) {
    await this._requireStack(userId, stackId);
    const si = await this.prisma.stackItem.findFirst({
      where: { stackId, inboxItemId: itemId },
    });
    if (!si) throw new NotFoundException('Item not in stack');
    await this.prisma.stackItem.delete({
      where: { inboxItemId: itemId },
    });
    await this.prisma.inboxItem.update({
      where: { id: itemId },
      data: { processedStackId: null },
    });
    await this.auditService.record(userId, 'stack.removeItem', {
      stackId,
      itemId,
      orderIdx: si.orderIdx,
    });
    return { removed: true };
  }

  async deleteStack(userId: string, id: string) {
    const stack = await this._requireStack(userId, id);
    const items = await this.prisma.stackItem.findMany({ where: { stackId: id } });
    const itemIds = items.map((i) => i.inboxItemId);

    // Return inbox items to unprocessed
    if (itemIds.length) {
      await this.prisma.inboxItem.updateMany({
        where: { id: { in: itemIds } },
        data: { processedStackId: null },
      });
    }
    await this.prisma.stack.delete({ where: { id } });

    await this.auditService.record(userId, 'stack.delete', {
      stack: {
        id: stack.id,
        title: stack.title,
        contextLabel: stack.contextLabel,
        summary: stack.summary,
      },
      itemIds,
    });
    return { deleted: true };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async _requireStack(userId: string, stackId: string) {
    const stack = await this.prisma.stack.findUnique({ where: { id: stackId } });
    if (!stack) throw new NotFoundException('Stack not found');
    if (stack.userId !== userId) throw new ForbiddenException();
    return stack;
  }

  private async _bindItems(userId: string, stackId: string, itemIds: string[]) {
    // Verify ownership
    const items = await this.prisma.inboxItem.findMany({
      where: { id: { in: itemIds }, userId },
    });
    if (items.length !== itemIds.length) {
      throw new ForbiddenException('Some items do not belong to user');
    }

    // Get current max orderIdx
    const last = await this.prisma.stackItem.findFirst({
      where: { stackId },
      orderBy: { orderIdx: 'desc' },
    });
    let idx = (last?.orderIdx ?? -1) + 1;

    await this.prisma.stackItem.createMany({
      data: itemIds.map((iid) => ({
        stackId,
        inboxItemId: iid,
        orderIdx: idx++,
      })),
      skipDuplicates: true,
    });
    await this.prisma.inboxItem.updateMany({
      where: { id: { in: itemIds } },
      data: { processedStackId: stackId },
    });
  }
}
