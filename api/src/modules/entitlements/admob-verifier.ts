import * as crypto from 'crypto';

// AdMob 공개키 목록 응답 형식
export interface AdMobKey {
  keyId: number;
  pem: string;
  base64: string;
}

export interface AdMobKeysResponse {
  keys: AdMobKey[];
}

// 공개키 페치 함수 타입 (테스트에서 주입 가능)
export type FetchAdMobKeys = () => Promise<AdMobKeysResponse>;

// 공개키 인메모리 캐시 (앱 재시작 전까지 재사용)
let cachedKeys: AdMobKeysResponse | null = null;

export async function fetchAdMobPublicKeys(
  fetchFn?: FetchAdMobKeys,
): Promise<AdMobKeysResponse> {
  if (cachedKeys) return cachedKeys;

  if (fetchFn) {
    cachedKeys = await fetchFn();
    return cachedKeys;
  }

  // 실제 AdMob 공개키 페치
  const res = await fetch(
    'https://www.gstatic.com/admob/reward/verifier-keys.json',
  );
  if (!res.ok) throw new Error('AdMob 공개키 페치 실패');
  cachedKeys = (await res.json()) as AdMobKeysResponse;
  return cachedKeys;
}

// 캐시 초기화 (테스트용)
export function clearKeyCache(): void {
  cachedKeys = null;
}

// AdMob SSV 파라미터 타입
export interface SsvParams {
  ad_network: string;
  ad_unit: string;
  reward_amount: string;
  reward_item: string;
  timestamp: string;
  transaction_id: string;
  user_id: string;
  signature: string;
  key_id: string;
  custom_data?: string;
}

/**
 * SSV 서명 검증에 사용할 쿼리 문자열 재구성
 * signature 파라미터는 제외하고 나머지를 알파벳순으로 정렬
 */
export function buildSignableString(params: SsvParams): string {
  // AdMob 명세: signature 제외, 나머지 key=value를 & 연결 (원본 쿼리 순서 유지)
  const ordered: Array<[string, string]> = [
    ['ad_network', params.ad_network],
    ['ad_unit', params.ad_unit],
    ['reward_amount', params.reward_amount],
    ['reward_item', params.reward_item],
    ['timestamp', params.timestamp],
    ['transaction_id', params.transaction_id],
    ['user_id', params.user_id],
  ];
  if (params.custom_data !== undefined) {
    ordered.push(['custom_data', params.custom_data]);
  }
  // custom_data는 마지막에 위치 (AdMob 명세 준수)
  const withoutCustomData = ordered.filter(([k]) => k !== 'custom_data');
  const customDataEntry = ordered.find(([k]) => k === 'custom_data');
  const final = customDataEntry
    ? [...withoutCustomData, customDataEntry]
    : withoutCustomData;
  return final.map(([k, v]) => `${k}=${v}`).join('&');
}

/**
 * ECDSA P-256 서명 검증
 * AdMob 서버는 SHA-256 해시를 ECDSA P-256으로 서명
 */
export function verifyEcdsaSignature(
  message: string,
  signatureBase64url: string,
  publicKeyPem: string,
): boolean {
  try {
    // Base64url → Base64 → Buffer
    const signatureB64 = signatureBase64url
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const signatureBuffer = Buffer.from(signatureB64, 'base64');

    const verify = crypto.createVerify('SHA256');
    verify.update(message, 'utf8');
    return verify.verify(publicKeyPem, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * AdMob SSV 전체 검증 로직
 * @returns 검증 성공 여부
 */
export async function verifyAdMobSsv(
  params: SsvParams,
  nowMs: number,
  fetchFn?: FetchAdMobKeys,
): Promise<boolean> {
  const keyId = parseInt(params.key_id, 10);
  if (isNaN(keyId)) return false;

  // 공개키 페치 및 key_id 매칭
  let keysResponse: AdMobKeysResponse;
  try {
    keysResponse = await fetchAdMobPublicKeys(fetchFn);
  } catch {
    return false;
  }

  const matchedKey = keysResponse.keys.find((k) => k.keyId === keyId);
  if (!matchedKey) return false;

  // timestamp 5분(300,000ms) 이내 검증
  const tsDiff = Math.abs(nowMs - parseInt(params.timestamp, 10));
  if (tsDiff > 5 * 60 * 1000) return false;

  // 서명 검증
  const signable = buildSignableString(params);
  return verifyEcdsaSignature(signable, params.signature, matchedKey.pem);
}
