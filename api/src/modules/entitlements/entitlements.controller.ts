import { Controller } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

// TODO W9-W10: POST /entitlements/webhook (RevenueCat), POST /admob/ssv (AdMob SSV)
@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}
}
