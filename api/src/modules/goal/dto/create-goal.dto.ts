import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { GoalDirection, GoalMetricType, GoalWeight } from '@prisma/client';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsInt()
  @Min(1)
  horizonDays!: number;

  @IsEnum(GoalWeight)
  @IsOptional()
  weight?: GoalWeight = GoalWeight.MED;

  @IsEnum(GoalMetricType)
  metricType!: GoalMetricType;

  @IsNumber()
  targetValue!: number;

  @IsNumber()
  @IsOptional()
  currentValue?: number = 0;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @IsEnum(GoalDirection)
  @IsOptional()
  direction?: GoalDirection = GoalDirection.UP;

  @IsString({ each: true })
  @IsOptional()
  linkedRoutineIds?: string[] = [];
}
