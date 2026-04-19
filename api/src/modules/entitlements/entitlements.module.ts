import { Module } from '@nestjs/common';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';

// TODO W9-W10: RevenueCat webhook + AdMob SSV + ad_token issue/verify
@Module({
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
