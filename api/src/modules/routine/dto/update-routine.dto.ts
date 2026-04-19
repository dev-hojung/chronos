import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const CRON_REGEX = /^(\S+\s+){4}\S+$/;

export class UpdateRoutineDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(CRON_REGEX, { message: 'scheduleCron must be a valid 5-field cron expression' })
  scheduleCron?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
