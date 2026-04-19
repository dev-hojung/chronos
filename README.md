# Chronos

> 스스로 정리되는 스케줄러 — 모바일 퍼스트 MVP

Chronos는 **자동실행-후-보고**(approve-by-default + undo) 패러다임으로 동작하는 스케줄러입니다.
사용자가 지시하기 전에 시스템이 먼저 정리·조정하고 배너 한 줄로 보고합니다.
모든 자동 동작은 audit log에 남고 언제든 되돌릴 수 있습니다.

> **AI-Lite 노선**: 핵심 자동화는 모두 **룰·통계·점수함수** 기반입니다 (Claude API 호출 0).
> 결정 투명성·오프라인 동작·비용 0·예측 가능성을 우선합니다.

## 3 핵심 기능

1. **Context Stack** — 키워드 분류기로 Inbox 메모를 4개 라벨(WORK / PERSONAL / RESEARCH / ADMIN)로 자동 추천. 사용자 1탭 확정 + 같은 라벨 ≥3개면 자동 묶기 스택 생성.
2. **Living Routines** — `routine_runs` 4주 통계(완료율·시간 시프트·CV)로 조정안 생성. confidence ≥ 0.75 + 최근 7일 수동 수정 없으면 자동 적용. 14일 undo, 2회 연속 되돌리기 시 8주 자동 차단.
3. **Goal-Gravity** — 점수 함수 `Σ(weight × (1+deficit)) − switch_penalty`로 Today 자동 재정렬. 매일 06:00 cron + 21:00 진척 푸시. 수동 드래그 시 그날 잠금.

## 모노레포 구조

```
chronos/
├── app/     # Expo RN (iOS/Android) — Expo Router + NativeWind + Zustand + TanStack Query
├── api/     # NestJS + Fastify + Prisma + @nestjs/schedule
└── web/     # Next.js 15 랜딩 + 결제 성공 페이지
```

## 주요 기술 스택

| 레이어 | 선택 |
|---|---|
| 모바일 | Expo SDK + Expo Router + NativeWind v4 + Zustand + TanStack Query |
| 백엔드 | NestJS + Fastify + Prisma 6.7 (Supabase PG 가정) + cron-parser + @nestjs/schedule |
| 인증 | Apple Sign-In (jose JWKS) + Google ID Token + JWT access/refresh |
| 광고 | react-native-google-mobile-ads (배너/전면/리워디드) + AdMob SSV(ECDSA) |
| 결제 | RevenueCat + Apple/Google IAP (W10) |
| 푸시 | expo-notifications + expo-server-sdk |
| 차트 | react-native-svg (ProgressRing) |

## 진행 현황 (W1 → W12)

- [x] **W1** — 모노레포 셋업 (Expo + NestJS + Next.js + Prisma 13 모델)
- [x] **W2** — Apple/Google Sign-In + JWT 로테이션 + NativeWind 디자인 토큰 + 다크모드
- [x] **W3** — Inbox/Stack CRUD + audit/undo + 모달 라우트 3개 + Android share intent
- [x] **W4** — 키워드 분류기(`classifyText`) + 자동 묶기 + suggestedLabel 컬럼
- [x] **W5** — Routine CRUD + cron-parser upcoming + 5분 전 알림 + 28일 히트맵
- [x] **W6** — 통계 분석기(평균/표준편차/CV) + 자동 적용 + 일요일 22시 cron + 14일 undo
- [x] **W7** — Goal CRUD + 트랜잭션 contribution + Routine→Goal 자동 수집 + ProgressRing
- [x] **W8** — Gravity 점수함수 + Today 자동 재정렬 + 06시/21시 cron + push token
- [x] **W9** — AdMob SSV + 24h ad_token + EntitlementGate + Paywall + 배너/전면/리워디드
- [ ] **W10** — RevenueCat IAP + 구독 webhook + entitlement 동기화
- [ ] **W11** — 위젯(WidgetKit/Glance) + EAS Build + TestFlight/Internal Testing
- [ ] **W12** — 앱스토어 심사 + 랜딩 + 베타 50명

자세한 12주 로드맵: `/.omc/plans/chronos-mobile-mvp.md`

## 검증 상태 (W9 시점)

- API `npm run build` ✅
- Jest **65 passing** (classifier 10 + analyzer 11 + goal contribution 17 + gravity 15 + entitlements 12)
- App `npx tsc --noEmit` ✅
- Web `npx tsc --noEmit` ✅

## 수익 모델

- **Free** — 모든 화면 사용 가능, 핵심 3기능은 일 1회 리워디드 광고 시청 후 24시간 이용권
- **Pro 월간** — ₩5,900 / **Pro 연간** — ₩39,000 (월 ₩3,250, 7일 무료 체험)
- 광고: 하단 배너(상시) + 루틴 완료 5회마다 전면(6분 간격) + 리워디드(이용권 발급)
- Pro 구독자는 모든 광고 비표시 + 핵심기능 무제한

## 실행 방법

### 사전 준비

- Node.js 20+ (v20.14에서 검증)
- npm 10+
- 모바일 개발: Xcode (iOS) / Android Studio (Android)
- 핵심기능 실 동작은 Supabase Postgres 연결 + Apple/Google OAuth 등록 + AdMob 콘솔 + EAS Dev Client 필요

### api (NestJS + Fastify + Prisma)

```bash
cd api
npm install
cp ../.env.example .env    # JWT/OAuth/Anthropic/AdMob/Redis 등 채우기
npx prisma generate
# DATABASE_URL 설정 후:
# npx prisma migrate dev --name init
npm run start:dev          # http://localhost:3000/health
npx jest                   # 65 tests
```

### app (Expo RN)

```bash
cd app
npm install
cp .env.example .env       # EXPO_PUBLIC_API_BASE / ADMOB / GOOGLE_CLIENT_ID 등
npx expo start             # Expo Go (단, AdMob/Apple/Google SDK는 placeholder 동작)
# 실 동작은 Dev Client 빌드:
# npx eas build --profile development --platform ios
```

### web (Next.js 랜딩)

```bash
cd web
npm install
npm run dev                # http://localhost:3000
```

## 실 운영 선행조건

| 영역 | 필요 항목 |
|---|---|
| DB | Supabase Postgres 프로비저닝 → DATABASE_URL → `prisma migrate deploy` |
| 인증 | Apple Developer (App ID `com.chronos.app` + Sign In with Apple) / Google Cloud OAuth iOS·Android·Web |
| 광고 | AdMob 앱 등록 + Banner/Interstitial/Rewarded ad unit + SSV 키 페치 |
| 결제 | RevenueCat 연동 + Apple/Google IAP 상품 등록 (W10) |
| 푸시 | APNs 인증서 + FCM 서버 키 |
| 배포 | Fly.io (api) + Vercel (web) + EAS Build (app) |

## 라이선스

Private — 공개 전.
