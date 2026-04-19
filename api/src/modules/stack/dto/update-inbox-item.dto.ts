import { IsEnum, IsOptional } from 'class-validator';
import { ContextLabel } from '@prisma/client';

export class UpdateInboxItemDto {
  @IsOptional()
  @IsEnum(ContextLabel)
  suggestedLabel?: ContextLabel;
}
