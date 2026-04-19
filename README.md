# Chronos

> 스스로 일하는 스케줄러 — 모바일 퍼스트 MVP

Chronos는 자동실행-후-보고(approve-by-default + undo) 패러다임으로 동작하는 AI 스케줄러입니다.
사용자가 지시하기 전에 AI가 먼저 정리하고 조정한 뒤, 배너 한 줄로 보고합니다.
마음에 들지 않으면 언제든 되돌릴 수 있습니다.

## 3 핵심 기능

1. **Context Stack** — 흩어진 Inbox 메모를 AI가 문맥별 스택으로 묶고 "다음 할일 1개"를 제안합니다.
2. **Living Routines** — 루틴의 완료율/소요시간을 학습해 AI가 스스로 시간대를 조정합니다.
3. **Goal-Gravity** — 장기 목표가 오늘 할일에 "중력"을 행사해 기여도 높은 항목을 위로 올립니다.

## 모노레포 구조

```
chronos/
├── app/     # Expo RN (iOS/Android) — Expo Router + NativeWind + Zustand + TanStack Query
├── api/     # NestJS + Fastify + Prisma (Supabase Postgres 관리형 가정)
└── web/     # Next.js 랜딩 + 결제 성공 페이지
```

## 실행 방법

### 사전 준비

- Node.js 20+ (프로젝트는 v20.14로 검증됨)
- npm 10+
- 모바일 개발: Xcode (iOS) / Android Studio (Android), Expo Go 앱 권장
- `.env.example`을 복사해 `.env` 작성 후 각 하위 프로젝트에 필요한 값 입력

### app (Expo RN)

```bash
cd app
npm install
npx expo start            # Expo Go로 QR 스캔
# 또는
npx expo run:ios
npx expo run:android
```

### api (NestJS + Fastify + Prisma)

```bash
cd api
npm install
npx prisma generate
# Supabase Postgres 연결 후:
# npx prisma migrate dev --name init
npm run start:dev
# Health check: http://localhost:3000/health
```

### web (Next.js 랜딩)

```bash
cd web
npm install
npm run dev               # http://localhost:3001
```

## W1 상태

- [x] 모노레포 루트 + git init
- [x] `app/` Expo RN + Expo Router 하단 탭 5개 (Today / Timeline / Routines / Goals / Me)
- [x] `api/` NestJS + Fastify + Prisma 스키마 (User, InboxItem, Stack, Routine, Goal, AuditLog, DailyPlan)
- [x] `web/` Next.js 랜딩 페이지 골격
- [ ] W2: 인증 (Apple/Google Sign-In + JWT) + 디자인 시스템 토큰

자세한 12주 로드맵은 `/.omc/plans/chronos-mobile-mvp.md` 참조.

## 라이선스

Private — 공개 전.
