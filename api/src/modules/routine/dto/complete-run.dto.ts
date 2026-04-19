import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export type RunStatus = 'done' | 'skipped' | 'snoozed' | 'missed';

export class CompleteRunDto {
  @IsString()
  @IsNotEmpty()
  routineRunId!: string;

  @IsEnum(['done', 'skipped', 'snoozed', 'missed'])
  status!: RunStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  actualDurationMin?: number;

  @IsOptional()
  @IsISO8601()
  completedAt?: string;
}
