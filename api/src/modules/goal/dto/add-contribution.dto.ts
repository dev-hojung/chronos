import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ContributionSourceType } from '@prisma/client';

export class AddContributionDto {
  @IsString()
  @IsNotEmpty()
  goalId!: string;

  @IsEnum(ContributionSourceType)
  sourceType!: ContributionSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsNumber()
  deltaValue!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDateString()
  loggedAt?: string;
}
