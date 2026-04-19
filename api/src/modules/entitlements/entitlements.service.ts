import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyAdMobSsv, type FetchAdMobKeys, type SsvParams } from './admob-verifier';

// 핵심기능 feature 코드
export type CoreFeature = 'stack.autoBundle' | 'routine.analyze' | 'plan.generate';

// ad_token 엔트리 (24h TTL "이용권" 패턴)
interface AdTokenEntry {
  feature: CoreFeature;
  grantedAt: number;      // ms
  expiresAt: number;      // ms (grantedAt + 24h)
  transactionId: string;
  consumedAt?: number;    // 최초 사용 시각 (이후에도 만료 전까지 유효)
}

// 인메모리 ad_token 저장소: userId → AdTokenEntry[]
const adTokenStore = new Map<string, AdTokenEntry[]>();

// transaction_id 중복 방지 (24h TTL): transactionId → expiresAt
const txnStore = new Map<string, number>();

const TTL_24H = 24 * 60 * 60 * 1000;

/** 만료된 항목 정리 */
function pruneTokens(userId: string, nowMs: number): void {
  const entries = adTokenStore.get(userId) ?? [];
  const active = entries.filter((e) => e.expiresAt > nowMs);
  if (active.length > 0) {
    adTokenStore.set(userId, active);
  } else {
    adTokenStore.delete(userId);
  }
}

function pruneTxn(nowMs: number): void {
  for (const [id, exp] of txnStore.entries()) {
    if (exp <= nowMs) txnStore.delete(id);
  }
}

@Injectable()
export class EntitlementsService {
  // fetchFn 주입 가능 (테스트용)
  private _fetchAdMobKeys?: FetchAdMobKeys;

  setFetchAdMobKeys(fn: FetchAdMobKeys): void {
    this._fetchAdMobKeys = fn;
  }

  /**
   * AdMob SSV 콜백 검증
   * - 공개키 페치 → ECDSA 서명 검증
   * - timestamp 5분 이내
   * - transaction_id 중복 거부
   */
  async verifyAdMobSsv(params: SsvParams): Promise<boolean> {
    const nowMs = Date.now();
    pruneTxn(nowMs);

    // transaction_id 중복 검증
    if (txnStore.has(params.transaction_id)) return false;

    const valid = await verifyAdMobSsv(params, nowMs, this._fetchAdMobKeys);
    if (valid) {
      // 24h 동안 중복 방지
      txnStore.set(params.transaction_id, nowMs + TTL_24H);
    }
    return valid;
  }

  /**
   * ad_token 발급: 24h 이용권
   * custom_data = "userId:feature" 형식에서 feature 파싱
   */
  grantAdToken(userId: string, feature: CoreFeature, transactionId: string): AdTokenEntry {
    const nowMs = Date.now();
    pruneTokens(userId, nowMs);

    const entry: AdTokenEntry = {
      feature,
      grantedAt: nowMs,
      expiresAt: nowMs + TTL_24H,
      transactionId,
    };

    const entries = adTokenStore.get(userId) ?? [];
    entries.push(entry);
    adTokenStore.set(userId, entries);
    return entry;
  }

  /**
   * ad_token 소비: 24h 이용권 패턴
   * - 유효한 토큰이 있으면 consumedAt 기록 후 true
   * - 이미 consumed되어도 만료 전이면 true (재사용 허용)
   */
  consumeAdToken(userId: string, feature: CoreFeature): boolean {
    const nowMs = Date.now();
    pruneTokens(userId, nowMs);

    const entries = adTokenStore.get(userId) ?? [];
    const token = entries.find(
      (e) => e.feature === feature && e.expiresAt > nowMs,
    );
    if (!token) return false;

    // 최초 사용 시 consumedAt 기록 (이후 재사용도 허용)
    if (!token.consumedAt) {
      token.consumedAt = nowMs;
    }
    return true;
  }

  /**
   * 엔타이틀먼트 확인: PRO 구독 OR 유효 ad_token
   */
  hasEntitlement(
    userId: string,
    tier: 'FREE' | 'PRO',
    feature: CoreFeature,
  ): { granted: boolean; source: 'pro' | 'ad_token' | null; expiresAt?: Date } {
    if (tier === 'PRO') {
      return { granted: true, source: 'pro' };
    }

    const nowMs = Date.now();
    pruneTokens(userId, nowMs);
    const entries = adTokenStore.get(userId) ?? [];
    const token = entries.find(
      (e) => e.feature === feature && e.expiresAt > nowMs,
    );

    if (token) {
      return {
        granted: true,
        source: 'ad_token',
        expiresAt: new Date(token.expiresAt),
      };
    }

    return { granted: false, source: null };
  }

  /**
   * 엔타이틀먼트 필수 확인: 없으면 403 ENTITLEMENT_REQUIRED
   */
  requireEntitlement(
    userId: string,
    tier: 'FREE' | 'PRO',
    feature: CoreFeature,
  ): void {
    const result = this.hasEntitlement(userId, tier, feature);
    if (!result.granted) {
      throw new ForbiddenException({
        code: 'ENTITLEMENT_REQUIRED',
        feature,
        message: '이 기능을 사용하려면 Pro 구독 또는 광고 시청이 필요합니다.',
      });
    }
  }

  // 테스트 지원: 인메모리 저장소 초기화
  _clearAll(): void {
    adTokenStore.clear();
    txnStore.clear();
  }
}
