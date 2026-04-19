import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { InboxSource } from '@prisma/client';

export class CreateInboxItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawText!: string;

  @IsEnum(InboxSource)
  source: InboxSource = InboxSource.TEXT;
}
