import { IsNumberString, IsOptional, IsString } from 'class-validator';

// AdMob SSV (Server-Side Verification) 콜백 쿼리 파라미터 DTO
export class VerifySsvDto {
  @IsString()
  ad_network!: string;

  @IsString()
  ad_unit!: string;

  @IsNumberString()
  reward_amount!: string;

  @IsString()
  reward_item!: string;

  @IsNumberString()
  timestamp!: string;        // Unix ms 타임스탬프

  @IsString()
  transaction_id!: string;

  @IsString()
  user_id!: string;

  @IsString()
  signature!: string;        // Base64url ECDSA 서명

  @IsNumberString()
  key_id!: string;

  @IsOptional()
  @IsString()
  custom_data?: string;      // userId:feature 형태로 앱이 부착
}
