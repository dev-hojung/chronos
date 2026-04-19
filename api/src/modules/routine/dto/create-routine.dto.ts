import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

// Basic cron format: 5 fields separated by spaces
const CRON_REGEX = /^(\S+\s+){4}\S+$/;

export class CreateRoutineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @Matches(CRON_REGEX, { message: 'scheduleCron must be a valid 5-field cron expression' })
  scheduleCron!: string;

  @IsInt()
  @Min(1)
  durationMin!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
