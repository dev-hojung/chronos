import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ContextLabel,
  GoalDirection,
  GoalMetricType,
  GoalStatus,
  GoalWeight,
} from '@prisma/client';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  horizonDays?: number;

  @IsOptional()
  @IsEnum(GoalWeight)
  weight?: GoalWeight;

  @IsOptional()
  @IsEnum(GoalMetricType)
  metricType?: GoalMetricType;

  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsEnum(GoalDirection)
  direction?: GoalDirection;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @IsOptional()
  @IsDateString()
  archivedAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedRoutineIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(ContextLabel, { each: true })
  linkedStackContextLabels?: ContextLabel[];
}
