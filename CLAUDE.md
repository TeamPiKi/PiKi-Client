# CLAUDE.md

> **디프만 18기 3팀 — 위시리스트 소비 결정 서비스**
> 이 문서는 Claude Code가 프로젝트 작업 시 반드시 따라야 할 규칙 및 컨텍스트를 정의합니다.
> 팀원 전원이 공유하는 AI 협업 규약이며, 모든 코드 생성/리팩토링은 이 규약을 따릅니다.

---

## 🎯 프로젝트 컨텍스트

### 한 줄 정의

**쌓인 위시리스트에서 먼저 살 것을 골라주는 소비 결정 서비스**

### 타겟 유저

위시리스트와 장바구니는 가득하지만, 선택 피로로 구매를 계속 미루는 패션·라이프스타일 중심의 **20~30대 모바일 쇼핑 사용자**.

### 핵심 기능

- **링크 기반 상품 저장** — 여러 쇼핑몰 링크를 한곳에 모음
- **1:1 토너먼트 비교** — 두 개씩 비교해 최종 1순위 결정 (WOW 포인트)
- **AI 소비 메이트** — 질문/공감/리마인드 (WOW 포인트)
- **보류함 & 재판단 알림** — 방치된 위시 재방문 유도
- **커머스 직접 연동** — 결정된 상품 즉시 구매

### 플랫폼 전략

**RN(Expo) 앱이 WebView로 Next.js 웹앱을 감싸는 구조.**
→ 실제 UI/비즈니스 로직은 `apps/web`에 집중. 네이티브 기능만 `apps/app`에서 처리.

---

## 💻 기술 스택

### 공통

- **패키지 매니저**: pnpm 10.17.0
- **모노레포**: Turborepo
- **언어**: TypeScript 5.9.2
- **배포**: Vercel (web), Expo (app)

### apps/web (Next.js)

- **프레임워크**: Next.js 16 (App Router)
- **React**: 19.2.0
- **상태관리**: Zustand
- **스타일링**: Tailwind CSS v4 (루트 공통 설정, 각 앱에서 상속)
- **API 통신**: TanStack Query (@tanstack/react-query)
- **스키마 검증**: Zod
- **API 모킹**: MSW (필요 시)
- **아이콘**: `@/assets/icons` (fill/outline SVG) — Lucide React 사용 안 함
- **E2E 테스트**: Playwright (`pnpm test:e2e`) — 작성법·목킹 구조는 `apps/web/e2e/README.md` 참고

### apps/app (React Native)

- **프레임워크**: React Native + Expo
- **라우팅**: Expo Router
- **주요 역할**: WebView로 `apps/web` 렌더링

### CI/CD

- **GitHub Actions**: PR 단위 빌드 검사 (`lint` → `check-types` → `build`)
- **필수 통과 조건**: `pnpm install --frozen-lockfile`

---

## 📁 프로젝트 구조

### 모노레포 루트

```
18th-team3-client/
├── apps/
│   ├── app/              # React Native + Expo (WebView 래퍼)
│   └── web/              # Next.js 16 (메인 서비스)
├── packages/
│   ├── core/             # @piki/core — 웹뷰 통신용 type/hook/util
│   └── typescript-config/ # @piki/typescript-config
├── prettier.config.mjs   # 루트 Prettier (공통)
├── eslint.config.mjs   # 루트 ESLint (공통)
├── .prettierignore
└── turbo.json
```

### apps/web 내부 (페이지별 폴더 구조)

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx            # 홈
│   ├── providers.tsx       # TanStack Query Provider
│   ├── fonts/
│   ├── tournament/         # 토너먼트 (예시)
│   │   ├── page.tsx
│   │   ├── _common/            # tournament/* 하위 라우트 간 공유
│   │   │   ├── _components/
│   │   │   ├── _hooks/
│   │   │   ├── _consts/
│   │   │   └── _types/
│   │   └── create/
│   │       ├── page.tsx
│   │       ├── _common/        # create/* 하위 라우트 간 공유
│   │       │   ├── _components/
│   │       │   ├── _hooks/
│   │       │   └── _consts/
│   │       └── by-wish/
│   │           ├── page.tsx
│   │           └── _components/  # by-wish 전용 (아직 레벨업 전)
│   ├── wishlist/
│   │   ├── page.tsx
│   │   └── _components/        # wishlist 전용
│   └── ...
├── components/
│   └── common/   # app/ 밖 — top-level 라우트 간 공유 + 범용 UI
│       └── {component-name}/             # 폴더명: kebab-case
│           ├── index.tsx                 # 컴포넌트 본체 (default export)
│           ├── {componentName}.style.ts  # cva variants (스타일 분리 시)
│           ├── {componentName}.const.ts  # 상수 (필요 시)
│           └── {componentName}.types.ts  # 타입 (필요 시)
├── apis/         # API 호출 함수 (HTTP 메서드 prefix 컨벤션)
├── hooks/        # 커스텀 훅
├── utils/        # 공통 유틸리티 함수
├── types/        # 공통 타입 정의 (T suffix)
├── assets/       # 정적 리소스 (SVG, 이미지)
├── styles/       # globals.css (Tailwind import)
└── consts/       # 상수
```

**Colocation 배치 (한 단계씩 레벨업):**

코드는 **가장 가까운 사용처**에 둔다. 재사용 범위가 넓어질 때만 **부모 라우트로 한 단계** 끌어올린다. 처음부터 `components/common/`에 두지 않는다.

| 재사용 범위                                                     | 배치 위치                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 단일 `page.tsx` 전용                                            | 해당 라우트 폴더의 `_components/` (또는 `_hooks/`, `_apis/`, `_consts/`, `_types/`) |
| **같은 부모 아래 2개 이상** 하위 라우트에서 공유                | **부모 라우트**의 `_common/_components/` 등으로 끌어올림                            |
| **`app/` top-level 라우트 간** 공유 (tournament ↔ wishlist 등)  | `components/common/{component-name}/` — **App Router 밖**으로 이동                  |
| **2개 이상 top-level 라우트 또는 앱 전역**에서 쓰는 API/훅/유틸 | `src/apis/`, `hooks/`, `utils/`, `consts/`, `types/`                                |

**API 함수 배치 예시:**

- 단일 페이지 전용 (홈의 토너먼트 리스트 조회 등) → `app/home/_apis/getTournamentList.ts`
- 2개 이상 페이지에서 공유 (유저 정보 조회, 이미지로 위시 담기 등) → `src/apis/`

```
예) by-wish/page 전용                    → app/tournament/create/by-wish/_components/
    create/page + by-wish/page 에서 공유  → app/tournament/create/_common/_components/  (↑ app 내 한 단계)
    tournament/* 전체에서 공유              → app/tournament/_common/_components/       (↑ app 내 한 단계)
    tournament + wishlist 등 top-level 공유 → components/common/{name}/                (app/ 밖으로)
    Button, Dialog 등 범용 UI             → components/common/button/
```

- **한 라우트 전용** → `_components/` 등을 라우트 폴더에 직접 둔다
- **app/ 내부 레벨업(형제 라우트 간 공유)** → 부모에 `_common/`을 만들고 그 안에 `_components/`, `_hooks/`, `_consts/`, `_types/` 배치
- **`app/` top-level 라우트를 넘나들면** `_common/`을 더 이상 쌓지 않고 `src/components/common/`(또는 `hooks/`, `utils/` 등)으로 이동
- `app/_common/`, `app/_components/` ❌ — top-level 간 공유는 App Router 밖에서 관리
- 필요한 폴더만 생성 — 빈 폴더는 만들지 않음

**`components/common` (App Router 밖):**

- `app/` **top-level 라우트 간** 공유되거나, **앱 전역 범용 UI**는 여기로 이동
- `{component-name}/` **kebab-case 폴더** 안에 둔다 — 바로 아래 `.tsx` 금지
- import는 폴더까지만 — `@/components/common/{component-name}`

**컴포넌트 폴더 내부 파일명:**

| 파일 종류         | 규칙                         | 예시                                    |
| ----------------- | ---------------------------- | --------------------------------------- |
| **대표 컴포넌트** | `index.tsx` (default export) | `button/index.tsx`                      |
| **보조 컴포넌트** | PascalCase                   | `UserProfile.tsx`, `ButtonLink.tsx`     |
| **스타일 (cva)**  | camelCase + `.style.ts`      | `button.style.ts`, `stateChip.style.ts` |
| **상수**          | camelCase + `.const.ts`      | `joinErrorDialog.const.ts`              |
| **타입**          | camelCase + `.types.ts`      | `userProfile.types.ts`                  |

- **폴더명**: kebab-case (`button/`, `wish-card/`, `state-chip/`)

```tsx
// ✅ Good
import Button from '@/components/common/button';
import StateChip from '@/components/common/state-chip';
import { stateChipStyles } from '@/components/common/state-chip/stateChip.style';

// ❌ Bad — common 바로 아래 파일, PascalCase 폴더, 중복 경로
import Button from '@/components/common/Button';
import Button from '@/components/common/Button/Button';
```

### Path Alias

`@/*` → `apps/web/src/*`

---

## 📝 네이밍 컨벤션

| 대상                     | 규칙                            | 예시                                                    |
| ------------------------ | ------------------------------- | ------------------------------------------------------- |
| **폴더**                 | kebab-case                      | `wish-card/`, `state-chip/`                             |
| **공통 컴포넌트 본체**   | `index.tsx`                     | `components/common/button/index.tsx`                    |
| **보조 컴포넌트 파일**   | PascalCase                      | `UserProfile.tsx`, `ButtonLink.tsx`                     |
| **스타일/상수/타입 파일** | camelCase                       | `button.style.ts`, `userProfile.types.ts`               |
| **일반 파일** (훅, 유틸) | camelCase                       | `useAuth.ts`, `formatDate.ts`                           |
| **타입**                 | T suffix                        | `UserT`, `ProductT`                                     |
| **API 함수**             | HTTP 메서드 prefix              | `getUser`, `postWishlist`, `patchProfile`, `deleteItem` |
| **API 요청/응답 타입**   | 함수명 + `RequestT`/`ResponseT` | `PostWishRequestT`, `PostWishResponseT`                 |
| **API 훅**               | `use` + 함수명                  | `usePostWish`, `usePatchItem`, `useGetWishlist`         |
| **공통 객체 타입**       | `src/types/` 에 위치, T suffix  | `WishT`, `ItemT`, `UserT`                               |

---

## 🌐 API 컨벤션

- **요청/응답 타입**: 함수명을 PascalCase로 한 뒤 `RequestT` / `ResponseT` 접미
  - `postWish` → `PostWishRequestT`, `PostWishResponseT`
- **API 훅**: `use` + 함수명
  - `postWish` → `usePostWish`, `patchItem` → `usePatchItem`
- **API endpoint**: `src/consts/api.ts` 에 상수로 모아서 관리
- **공통 객체 타입**(wish/item/tournament 등 도메인 모델): `src/types/<domain>.ts`
  - 예: `src/types/wish.ts` 에 `WishT`, `src/types/item.ts` 에 `ItemT`
- **API 함수 위치**:
  - 단일 페이지 전용 → `app/<page>/_apis/`
  - 2개 이상 페이지에서 공유 → `src/apis/`

---

## 🎨 코딩 컨벤션

### 컴포넌트

- **`function` 키워드 + default export**

```tsx
function MyComponent({ children }: MyComponentProps) {
  return <div>{children}</div>;
}

export default MyComponent;
```

### 유틸 함수

- **화살표 함수** 사용

```ts
const formatDate = (date: Date) => date.toISOString();
```

### 타입 선언

- **`type` 사용** (interface 대신)
- **T suffix** (컨벤션상 타입 선언 시)
- Props 타입명: `{ComponentName}Props`

```ts
type UserT = {
  id: number;
  name: string;
};

type MyComponentProps = {
  children: React.ReactNode;
};
```

### Props 네이밍

- **내부 핸들러**: `handle-` (예: `handleClick`, `handleSubmit`)
- **외부에서 받는 props**: `on-` (예: `onClick`, `onSubmit`)

```tsx
function Button({ onClick }: ButtonProps) {
  const handleClick = () => {
    // 내부 로직
    onClick?.();
  };
  return <button onClick={handleClick}>...</button>;
}
```

### API 훅 반환값 네이밍 (TanStack Query)

훅 내부에서 의미 있는 이름으로 rename 후 반환 — 호출하는 쪽에서 매번 `data: xxx` 처럼 rename하지 않도록.

- **Query**: `data` → `{도메인}Data`
- **Mutation**:
  - `mutate` → `{HTTP 메서드 prefix + 도메인}Mutation`
  - `isPending` → `is{Http메서드 prefix + 도메인}Pending`

```ts
// ✅ Query — data를 도메인명 + Data로
export const useGetWishlist = () => {
  const { data: wishlistData } = useQuery({ queryKey: ['wishlists'], queryFn: getWishlist });
  return { wishlistData };
};
// 사용처: const { wishlistData } = useGetWishlist();

// ✅ Mutation — mutate/isPending에 API 함수명 + Mutation/Pending 접미
export const usePostGuestLogin = () => {
  const { mutate: postGuestLoginMutation, isPending: isPostGuestLoginPending } = useMutation({
    mutationFn: postGuestLogin,
  });
  return { postGuestLoginMutation, isPostGuestLoginPending };
};
// 사용처: const { postGuestLoginMutation } = usePostGuestLogin();
```

### 기타

- **세미콜론**: 사용 (`semi: true`)
- **따옴표**: `singleQuote: true` (`'홑따옴표'`)
- **printWidth**: 100
- **trailingComma**: `'es5'`
- **arrowParens**: `'avoid'` (인자 1개 시 괄호 생략)

---

## 🧩 RSC / UI / Next 가이드

- **`page.tsx`는 가능하면 RSC** — `'use client'`는 상호작용이 필요한 자식 컴포넌트로 내림
- **고정 width 지양** — 모바일은 `w-full + px-5` 패턴, 상한은 `max-w-*`로
- **Semantic tag** — 컨테이너는 `<main>`, 타이틀은 `<h1>`/`<h2>`
- **클릭 요소엔 `cursor-pointer`** (Tailwind v4는 자동 적용 X, 공통 `Button`은 cva에서 처리됨)
- **Next 기능 우선** — `<Link>`, `<Image>`, `next/font` 등. `router.push`는 부수 작업(Dialog 닫기, API 후 처리)이 있을 때만

---

## 📱 웹뷰 브릿지 (앱 ↔ 웹)

웹은 Vercel로 즉시 배포되지만 앱은 스토어 심사와 유저 업데이트를 거친다. **항상 구버전 앱이 남아 있다고 전제**하고 작성한다.

### 메시지 타입 값은 변경 금지

```ts
export const WEBBRIDGE_MESSAGE_TYPE = {
  WEB_REQ_SOCIAL_LOGIN: 'REQUEST_SOCIAL_LOGIN',
  //└─ 키: 코드에서 참조    └─ 값: 실제 전송되는 문자열
} as const;
```

- **키** — 자유롭게 변경 가능. 순수 코드 리팩터링이라 앱과 무관
- **값** — 배포된 앱과의 **공개 API**. 바꾸면 구버전 앱이 메시지를 인식하지 못한다
- 네이밍 규칙(`WEB_REQ_*` / `APP_RES_*` / `APP_REQ_*` / `WEB_RES_*`)은 **키**에만 적용. 규칙 이전에 만들어진 값은 어긋난 채로 유지한다

값을 꼭 바꿔야 하면 3단계로 나눈다 — ① 앱이 옛 값·새 값 모두 수신 → 릴리즈 ② 웹이 앱 버전 보고 보낼 값 선택 ③ 구버전이 지원 기준선 아래로 내려가면 옛 값 제거.

### 새 브릿지 메시지는 `BRIDGE_GATE`에 등록

`packages/core/src/consts/appVersion.ts`에 최소 앱 버전과 안내 노출 여부를 등록한다. 등록하지 않으면 컴파일 에러가 나지만, **값 판단은 사람이 해야 한다.**

- `minAppVersion` — 앱쪽 핸들러 커밋에 `git tag --contains <sha>`를 돌려 최초로 포함하는 `app-v*` 태그를 쓴다. 날짜로 추정하지 말 것
- `notifyOnBlock` — 사용자가 직접 유발한 동작(피커 열기, 권한 요청)만 `true`. 애널리틱스·토큰 동기화 같은 백그라운드 동작은 조용히 실패해야 한다

### 앱 응답을 기다리면 `postMessage` 반환값을 확인

`WebBridge.postMessage`는 전송 여부를 `boolean`으로 반환한다. 게이트에 막히면 앱 응답이 영영 오지 않으므로, 대기 상태(pending promise, 로딩 플래그)를 직접 정리해야 한다.

```ts
const isSent = WebBridge.postMessage({ ... });
if (!isSent) {
  pendingRequestsRef.current.delete(requestId);
  setIsPending(false);
  return;
}
```

### 인바운드 메시지는 payload를 신뢰하지 말 것

`isWebBridgeMessageT`는 `type`이 문자열인지만 확인한다. **payload는 런타임 검증이 없으므로** 구버전 앱이 다른 형태를 보내면 그대로 터진다. 새로 수신 핸들러를 쓸 때는 payload 접근을 방어적으로 한다.

---

## 📦 Import 규칙

### 정렬 (자동화됨 — `@trivago/prettier-plugin-sort-imports`)

```
1. 외부 라이브러리  (<THIRD_PARTY_MODULES>)
2. 절대경로        (^@/)
3. 상대경로        (^[./])
```

### 예시

```tsx
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '@/apis/apiClient';
import { UserT } from '@/types/user';

import styles from './Page.module.css';
import { formatDate } from './utils';
```

### Prettier 옵션

- `importOrderSeparation: true` (그룹 간 빈 줄)
- `importOrderSortSpecifiers: true` (그룹 내 알파벳 정렬)

---

## 🚨 ESLint 주요 규칙

- `no-console`: warn/error만 허용 (`console.log` 금지)
- `no-nested-ternary`: error (중첩 삼항 금지)
- `@typescript-eslint/consistent-type-imports`: error (`import type` 강제)
- `@typescript-eslint/no-explicit-any`: error (`any` 금지)
- `unused-imports/no-unused-imports`: error
- `_` prefix 변수/인자는 unused 허용

---

## 🔀 Git 전략

### 브랜치 구조

```
main ← dev ← {type}/{issue-number}-{description}
```

### 브랜치 네이밍

- **패턴**: `{type}/{issue-number}-{description}`
- **예시**: `feat/1-login-page`, `chore/3-web-setup`, `fix/5-auth-bug`
- **타입**: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`

### 커밋 메시지

- **형식**: `{type}: {한글 설명}`
- **예시**:
  - `feat: 로그인 페이지 구현`
  - `chore: Prettier 설정 추가`
  - `fix: 토큰 만료 처리 수정`

### 머지 방식

- **Squash Merge** 사용
- PR 제목이 그대로 dev의 커밋 메시지가 됨 → PR 제목 신중히 작성

### PR 컨벤션

- **base 브랜치**: `dev` (main 아님)
- **템플릿**:

```markdown
## 작업 내용

[내용 정리]

## 스크린샷

## 연관 이슈

closes #이슈번호
```

### 코드 리뷰 — PN 룰

- **P1** (Request changes): 꼭 반영 — 중대한 오류 가능성
- **P2** (Request changes): 적극 고려 — 수용 or 토론
- **P3** (Comment): 웬만하면 반영 — 미반영 시 사유 설명
- **P4** (Approve): 반영해도/안해도 OK — 고민 정도
- **P5** (Approve): 사소한 의견 — 무시 가능

### 리뷰 규칙

- **랜덤 1명 승인** 시 머지 가능
- 리뷰 자동 배정 워크플로우 사용

---

## 🌐 API 통신 — Response Schema 규약

> 에러를 **어느 계층에서 어떻게 처리할지**는 [`docs/spec/error-handling-policy.md`](docs/spec/error-handling-policy.md)가 단일 기준이다.

### 기본 원칙

1. **HTTP Status Code는 REST 의미대로 사용** (200, 201, 400, 401, 403, 404, 409, 500)
2. **성공/실패 Body 구조 통일** — `{ data, code }` (`status`·`detail`·`success` 필드 없음)
3. **사용자 노출 에러 문구는 100% 프론트가 관리** — 서버는 `code`만 내려주고, 문구는 `@piki/core`의 에러 코드 카탈로그(`ERROR_MESSAGE_MAP`)에서 결정한다
4. **API 호출은 axios 인스턴스 사용** — 클라이언트는 `apis/client.ts`(`clientApi`), RSC/SSR은 `apis/server.ts`(`serverApi`). 4xx/5xx에서 자동 throw + 인터셉터(401 refresh, 탈퇴 계정 처리, Sentry 수집)가 걸려 있으므로 생 `fetch`를 쓰지 않는다

### 응답 구조

```json
// 성공 — code 는 항상 null
{ "data": { "wishId": 1 }, "code": null }

// 실패 — data 는 null, code 는 서버 에러 코드 (예: "WISH-004")
{ "data": null, "code": "WISH-004" }
```

| 필드   | 설명                                                         |
| ------ | ------------------------------------------------------------ |
| `data` | 실제 비즈니스 응답 데이터 (실패 시 `null`)                   |
| `code` | 서버 정의 에러 코드 (성공 시 `null`) — 문구·세부 분기의 원천 |

- 공통 타입: `src/types/api.ts`의 `ApiResponseT<T>`(성공) / `ApiErrorResponseT`(실패)
- 페이지네이션은 응답에 `pageResponse: { nextCursor, hasNext }`가 추가되는 형태 (예: `apis/getWishlist.ts`)

### 에러 코드 카탈로그 (`@piki/core`)

- `ERROR_MESSAGE_MAP` — code → 사용자 문구 (싱글 소스, web·app 공유)
- `ERROR_CODE` — 의미 기반 상수. **code 분기 시 문자열 리터럴 대신 반드시 이걸 사용** (`ERROR_CODE.WISH_NOT_FOUND`, `'WISH-004'` ❌)
- `getErrorMessageByCode(code)` — 순수 조회 헬퍼 (없으면 `null`)
- 원본은 api-docs(`info.description`) — 서버가 코드를 추가/삭제하면 카탈로그를 대조·갱신한다

### 에러 처리 표준

```ts
import { getApiErrorStatus, isGlobalNetError } from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

onError: error => {
  if (isGlobalNetError(error)) return; // 401·5xx·네트워크·탈퇴 계정은 전역이 처리

  toast.error(getApiErrorMessage(error)); // 4xx 는 빠짐없이 안내 (분기 밖!)
  if (getApiErrorStatus(error) === 404) router.replace(...); // 추가 동작이 필요한 status 만 분기
};
```

- **문구는 `code`, 동작은 `status`** — code 분기는 같은 status에서 동작이 갈릴 때만 2차로 쓰고, 반드시 else fallback을 둔다
- **전역이 가져간 에러는 개별에서 다시 다루지 않는다** — 목록은 `utils/apiError.ts` 의 `isGlobalNetError` 한 곳에만 둔다
- **개별 onError는 "4xx 전부 책임" 또는 "아예 없음(전역 위임)"** — 빈 onError/일부 code만 처리하는 부분 onError 금지

### HTTP Status 사용 기준

| 상황                      | HTTP Status               |
| ------------------------- | ------------------------- |
| 조회 성공                 | 200 OK                    |
| 생성 성공                 | 201 Created               |
| 잘못된 요청               | 400 Bad Request           |
| 인증 실패                 | 401 Unauthorized          |
| 권한 없음                 | 403 Forbidden             |
| 리소스 없음               | 404 Not Found             |
| 충돌 (만료·중복·상태전이) | 409 Conflict              |
| 서버 오류                 | 500 Internal Server Error |

---

## 🤖 Claude 작업 지침

### 코드 생성 시

- **위 컨벤션을 반드시 준수**
- 신규 컴포넌트: `function` 키워드 + PascalCase 파일명 + default export
- 신규 훅: 화살표 함수 + camelCase 파일명
- 신규 타입: `type` 키워드 + T suffix
- API 함수: HTTP 메서드 prefix (`getUser`, `postWishlist` 등)
- 경로는 `@/*` 절대경로 우선, 같은 디렉토리는 상대경로

### 커밋 메시지 제안 시

- `{type}: {한글 설명}` 형식 사용
- type: feat, fix, chore, docs, refactor, style, test

### PR 작성 시

- 제목: `{type}: {한글 설명}` 형식
- 본문에 `closes #이슈번호` 포함
- base 브랜치는 `dev`

### 리뷰 코멘트 작성 시

- PN 태그 (P1~P5) 사용
- 이유 명확히 설명

### API 관련 코드 생성 시

- body 구조: `{ data, code }` 가정 (`ApiResponseT<T>` / `ApiErrorResponseT`)
- 호출은 `clientApi`/`serverApi` 인스턴스, 에러 문구는 `getApiErrorMessage(error)`
- 에러 처리 계층은 `docs/spec/error-handling-policy.md` 를 따른다 (4xx 개별 / 5xx·401 전역)

### 의심스러울 때

- 기존 코드 패턴 확인
- 팀 컨벤션 우선 (이 문서)
- 판단 어려우면 사용자에게 확인
