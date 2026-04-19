import { IsOptional, IsString, MinLength } from 'class-validator';

export class AppleSignInDto {
  @IsString()
  @MinLength(10)
  idToken!: string;

  @IsOptional()
  @IsString()
  nonce?: string;
}

export class GoogleSignInDto {
  @IsString()
  @MinLength(10)
  idToken!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
