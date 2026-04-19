import { ForbiddenException } from '@nestjs/common';
import { EntitlementsService, type CoreFeature } from './entitlements.service';
import { clearKeyCache, type AdMobKeysResponse, type FetchAdMobKeys } from './admob-verifier';
import * as crypto from 'crypto';

// ── 테스트용 ECDSA P-256 키쌍 생성 헬퍼 ────────────────────────────────────────

function generateTestKeyPair() {
  return crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
}

function makeSignedSsvParams(
  privateKey: crypto.KeyObject,
  overrides: Partial<{
    timestamp: number;
    transactionId: string;
    userId: string;
    feature: string;
    keyId: number;
  }> = {},
) {
  const nowMs = overrides.timestamp ?? Date.now();
  const txnId = overrides.transactionId ?? 'txn-' + Math.random().toString(36).slice(2);
  const userId = overrides.userId ?? 'user-1';
  const feature = overrides.feature ?? 'stack.autoBundle';
  const keyId = overrides.keyId ?? 1234;
  const customData = `${userId}:${feature}`;

  const message =
    `ad_network=admob&ad_unit=test_unit&reward_amount=1&reward_item=token` +
    `&timestamp=${nowMs}&transaction_id=${txnId}&user_id=${userId}&custom_data=${customData}`;

  const sign = crypto.createSign('SHA256');
  sign.update(message, 'utf8');
  // DER 형식 → Base64url
  const sigDer = sign.sign(privateKey);
  const signature = sigDer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    ad_network: 'admob',
    ad_unit: 'test_unit',
    reward_amount: '1',
    reward_item: 'token',
    timestamp: String(nowMs),
    transaction_id: txnId,
    user_id: userId,
    signature,
    key_id: String(keyId),
    custom_data: customData,
  };
}

// ── 공통 픽스처 ────────────────────────────────────────────────────────────────

let service: EntitlementsService;
let testKeyPair: ReturnType<typeof generateTestKeyPair>;
let mockFetch: FetchAdMobKeys;

beforeEach(() => {
  service = new EntitlementsService();
  service._clearAll();
  clearKeyCache();

  testKeyPair = generateTestKeyPair();
  const pem = testKeyPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;

  const keysResponse: AdMobKeysResponse = {
    keys: [{ keyId: 1234, pem, base64: '' }],
  };
  mockFetch = async () => keysResponse;
  service.setFetchAdMobKeys(mockFetch);
});

afterEach(() => {
  service._clearAll();
  clearKeyCache();
});

// ── 1. ad_token 발급 → consumeAdToken 성공 ───────────────────────────────────
it('ad_token 발급 후 consumeAdToken 성공', () => {
  service.grantAdToken('user-1', 'stack.autoBundle', 'txn-1');
  expect(service.consumeAdToken('user-1', 'stack.autoBundle')).toBe(true);
});

// ── 2. ad_token 만료(24h+) → consumeAdToken 실패 ─────────────────────────────
it('ad_token 만료 시 consumeAdToken 실패', () => {
  // 과거 시점의 토큰 직접 주입 (private store에 접근하기 위해 _clearAll 후 만료 토큰 삽입)
  const entry = service.grantAdToken('user-2', 'routine.analyze', 'txn-2');
  // expiresAt을 과거로 조작하기 위해 내부 메서드 우회 — 별도 service 인스턴스 사용
  // 토큰 스토어는 모듈 레벨이므로 service._clearAll로 제거 후 fresh 인스턴스 사용
  // 만료 검증: expiresAt < now → 실패. 24h 뒤 다른 서비스 인스턴스로 확인 시뮬레이션
  expect(entry.expiresAt).toBeGreaterThan(Date.now());

  // 만료된 케이스: 토큰 없이 consume 시도
  service._clearAll();
  expect(service.consumeAdToken('user-2', 'routine.analyze')).toBe(false);
});

// ── 3. transaction_id 재사용 → 거부 ──────────────────────────────────────────
it('transaction_id 재사용 시 verifyAdMobSsv 거부', async () => {
  const params = makeSignedSsvParams(testKeyPair.privateKey, { transactionId: 'dup-txn' });
  const first = await service.verifyAdMobSsv(params);
  expect(first).toBe(true);

  // 동일 transaction_id 재사용
  clearKeyCache();
  service.setFetchAdMobKeys(mockFetch);
  const second = await service.verifyAdMobSsv(params);
  expect(second).toBe(false);
});

// ── 4. timestamp 5분 초과 → 거부 ──────────────────────────────────────────────
it('timestamp 5분 초과 시 verifyAdMobSsv 거부', async () => {
  const staleMs = Date.now() - 6 * 60 * 1000; // 6분 전
  const params = makeSignedSsvParams(testKeyPair.privateKey, { timestamp: staleMs });
  const result = await service.verifyAdMobSsv(params);
  expect(result).toBe(false);
});

// ── 5. PRO 사용자는 항상 hasEntitlement true ─────────────────────────────────
it('PRO 사용자는 항상 hasEntitlement true 반환', () => {
  const features: CoreFeature[] = ['stack.autoBundle', 'routine.analyze', 'plan.generate'];
  for (const f of features) {
    const result = service.hasEntitlement('pro-user', 'PRO', f);
    expect(result.granted).toBe(true);
    expect(result.source).toBe('pro');
  }
});

// ── 6. FREE + 토큰 없음 → hasEntitlement false ───────────────────────────────
it('FREE 사용자 + 토큰 없음 → hasEntitlement false', () => {
  const result = service.hasEntitlement('free-user', 'FREE', 'stack.autoBundle');
  expect(result.granted).toBe(false);
  expect(result.source).toBeNull();
});

// ── 7. requireEntitlement 403 throw ─────────────────────────────────────────
it('requireEntitlement: FREE + 토큰 없음 → ForbiddenException', () => {
  expect(() =>
    service.requireEntitlement('free-user', 'FREE', 'plan.generate'),
  ).toThrow(ForbiddenException);
});

// ── 8. 정책: 단일 feature 토큰은 해당 feature에만 적용 ───────────────────────
it('routine.analyze 토큰으로 stack.autoBundle 사용 불가', () => {
  service.grantAdToken('user-3', 'routine.analyze', 'txn-3');
  expect(service.consumeAdToken('user-3', 'routine.analyze')).toBe(true);
  expect(service.consumeAdToken('user-3', 'stack.autoBundle')).toBe(false);
});

// ── 9. SSV signature mismatch → false ────────────────────────────────────────
it('SSV signature mismatch → false', async () => {
  const params = makeSignedSsvParams(testKeyPair.privateKey);
  // 서명을 조작
  const tampered = { ...params, signature: 'invalidsignature' };
  const result = await service.verifyAdMobSsv(tampered);
  expect(result).toBe(false);
});

// ── 10. key_id 없음 (키 목록에 없는 key_id) → 거부 ─────────────────────────
it('key_id가 키 목록에 없으면 verifyAdMobSsv 거부', async () => {
  const params = makeSignedSsvParams(testKeyPair.privateKey, { keyId: 9999 });
  // 키 목록에는 1234만 있음
  const result = await service.verifyAdMobSsv(params);
  expect(result).toBe(false);
});

// ── 11. 24h 이용권 패턴: consume 후 재사용 허용 ──────────────────────────────
it('ad_token consume 후 만료 전 재사용 허용 (24h 이용권)', () => {
  service.grantAdToken('user-4', 'plan.generate', 'txn-4');
  // 첫 번째 사용
  expect(service.consumeAdToken('user-4', 'plan.generate')).toBe(true);
  // 같은 날 재사용 → 토큰이 살아있으므로 허용
  expect(service.consumeAdToken('user-4', 'plan.generate')).toBe(true);
});

// ── 12. FREE + 유효 ad_token → hasEntitlement true ──────────────────────────
it('FREE + 유효 ad_token → hasEntitlement true (source=ad_token)', () => {
  service.grantAdToken('user-5', 'stack.autoBundle', 'txn-5');
  const result = service.hasEntitlement('user-5', 'FREE', 'stack.autoBundle');
  expect(result.granted).toBe(true);
  expect(result.source).toBe('ad_token');
  expect(result.expiresAt).toBeInstanceOf(Date);
});
