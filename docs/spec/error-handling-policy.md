# 에러 처리 정책 (Error Handling Policy)

> API 응답 실패를 **어느 계층에서 어떻게 처리할지**에 대한 팀 공통 규약입니다.

---

## TL;DR

- **4xx (클라이언트/비즈니스 오류)** → **개별(호출부) 처리.** 원인별로 사용자 행동이 달라지므로 맞춤 UX.
- **5xx · 네트워크 오류** → **전역 처리.** 사용자가 할 수 있는 게 없으므로 공통 "일시적 오류" 토스트 + Sentry.
- **401 (인증 만료)** → **전역 인터셉터**가 토큰 refresh 후 자동 재시도, 실패 시 로그인 redirect.
- **인증/권한 게이팅** → **layout 가드(SSR)** 가 진입 시점에 차단.
- **조용히 실패 금지** → 개별 onError가 없어도 **전역 안전망**이 최소 토스트를 보장.
- **문구는 `code`, 동작은 `status`** → 사용자 문구는 `getApiErrorMessage(error)` 하나로 — code가 카탈로그에 있으면 그 문구, 없으면 generic fallback. 분기(이동/다이얼로그)는 status가 1차, code는 같은 status에서 동작이 갈릴 때만.

---

## 처리 계층 (요청 하나가 실패했을 때 걸리는 순서)

```text
① 전역 인터셉터   apis/client.ts            → 401 자동 refresh / 재시도 / 로그인 redirect
② Layout 가드     app/**/layout.tsx (SSR)   → 진입 시점 인증·권한 차단 (getMe 등)
③ 전역 MutationCache onError  utils/queryClient.ts
                                            → 5xx·네트워크 공통 처리 (+ Sentry)
                                            → 4xx인데 개별 처리 없으면 generic 토스트
④ 개별 onError    각 use*Mutation 훅         → 4xx 맞춤 UX (토스트/이동/롤백/전용 다이얼로그)
⑤ Error boundary  app/error.tsx / global-error.tsx
                                            → 렌더·RSC·suspense query throw fallback
```

> 위에서 걸린 건 아래에서 다시 처리하지 않는다. (예: 401은 ①에서 끝 → 개별 onError에서 401 분기 금지)

---

## Status 등급별 처리 주체

| Status             | 의미                      | 처리 주체                | 처리 방식                                                             |
| ------------------ | ------------------------- | ------------------------ | --------------------------------------------------------------------- |
| **200/201**        | 성공                      | 개별                     | onSuccess                                                             |
| **302**            | 리다이렉트                | (백엔드/브라우저)        | 프론트 직접 처리 X                                                    |
| **400**            | 잘못된 요청/검증          | **개별**                 | 인라인 에러 or `code` 문구 토스트                                     |
| **401**            | 인증 만료                 | **전역 인터셉터 ①**      | refresh → 재시도 → 실패 시 로그인                                     |
| **403**            | 권한 없음                 | **layout ② or 개별 ④**   | 게스트/미인증 = layout redirect · 그 외 = 개별 토스트                 |
| **404**            | 리소스 없음               | **layout ② or 개별 ④**   | 진입 게이팅은 layout · 액션 실패는 개별                               |
| **409**            | 충돌(만료/중복/이미 시작) | **개별**                 | 전용 다이얼로그/안내 (원인별 UX가 갈리면 `code` 2차 분기 — 아래 참고) |
| **413**            | 용량 초과                 | **개별 (+ 사전검증)**    | 업로드 전 클라 용량 체크 우선                                         |
| **5xx · 네트워크** | 서버/통신 오류            | **전역 MutationCache ③** | 공통 "일시적 오류" 토스트 + Sentry                                    |

---

## 계층별 상세

### ① 401 — 전역 인터셉터 (`apis/client.ts`)

- 401 응답 시 자동으로 `refreshClientToken()` → 원 요청 1회 재시도
- refresh 실패 시 로그인 페이지로 redirect (단 LOGIN/ROOT/auth callback 경로는 제외)
- **개별 훅에서 401을 따로 처리하지 않는다** (전역이 담당)
- 주의: `serverApi`(SSR)에는 refresh 인터셉터가 없다. 대신 401 을 세션 만료로 보고 `?action=session-expired` 로 로그인 redirect → proxy 가 죽은 토큰 쿠키를 폐기한다 (인증 경로 `/auth/*` 는 제외)
  - RSC 프리페치는 `utils/serverPrefetch.ts` 를 경유해야 한다 — `queryClient.prefetchQuery` 는 내부가 `catch(noop)` 이라 이 redirect 를 삼킨다
- 탈퇴한 계정(409 `USER-003`)은 401과 같은 계층에서 처리한다 — 양쪽 인터셉터가 세션을 정리하고 로그인으로 보낸다

### ② 인증·권한 게이팅 — Layout 가드 (SSR)

일부 4xx는 **"화면 진입 자체를 막는" 문제**라 개별 onError가 아니라 layout에서 처리한다.

- 예: `app/archive/layout.tsx` — SSR에서 `getMe` 조회
  - `identityType !== 'MEMBER'` (게스트) → 로그인 redirect
  - `getMe`가 401/404 → 로그인 redirect (세션 만료)
- 예: `app/tournament/[id]/layout.tsx` — 404 → `notFound()`
- **그래서 개별 액션에서 중복 처리 불필요한 경우가 있다:**
  - 위시 삭제의 403(게스트) → archive layout이 진입에서 이미 차단 → 삭제 onError에서 재처리 X
  - "본인 위시 아닌 항목" 403 → `GET /wishlists`가 본인 것만 반환하므로 정상 UI에선 선택 불가 → 개별 분기 X (도달 시 전역 안전망이 덮음)

> **판단 기준**: "이 4xx가 화면 진입 조건(로그인/멤버/존재 여부)인가?" → 예면 layout, 아니면 개별.

### ③ 5xx · 네트워크 — 전역 MutationCache onError (`utils/queryClient.ts`)

- **5xx(500/502/503…)와 네트워크 오류(`error.response` 없음)는 전역이 단독으로 처리한다.**
  - `getApiErrorMessage` 토스트 + `Sentry.captureException`
  - 5xx도 문구는 code로 갈린다 — `COMMON-RETRYABLE`(502) / `COMMON-SERVER-BUSY`(503) / `COMMON-SERVER-ERROR`(500).
    에러 바운더리(`app/error.tsx`)도 같은 카탈로그를 쓴다 (code 없으면 `SERVER_ERROR_MESSAGE`)
- **개별 onError는 5xx를 건드리지 않는다** (아래 개발 규칙 참고) → 토스트 중복 방지
- 4xx인데 개별 onError가 없으면 전역이 generic 토스트로 fallback (silent failure 방지)

### ④ 4xx — 개별 onError (각 mutation 훅)

- 400/403(비게이팅)/404(액션)/409/413은 **원인별로 사용자 행동이 다르므로 호출부에서 맞춤 처리**
- 처리 예: 검증 에러 인라인 표시, 만료 다이얼로그, 낙관적 업데이트 롤백, `getApiErrorMessage` 토스트
- **4xx만 분기한다. 5xx 브랜치를 두지 않는다.**

> ⚠️ **전역 4xx fallback은 개별 onError가 "없을 때만" 작동한다** (`if (mutation.options.onError) return`).
> 그래서 개별 onError는 **"4xx 전부 책임" 또는 "아예 없음(전역 위임)"** 둘 중 하나여야 한다.
>
> - **비어있는 onError**(`// TODO`만) → 존재로 취급돼 전역이 양보 → silent. **삭제할 것.**
> - **부분 onError**(일부 4xx만) → 빠진 4xx는 개별도 전역도 안 잡음 → silent. **도달 가능한 4xx를 전부 채울 것.**
>
> **토스트는 status 분기 밖에 둔다.** 분기 안에 넣으면 나열하지 않은 status가 그대로 silent가 된다.
>
> ```ts
> onError: error => {
>   if (isGlobalNetError(error)) return; // 401·5xx·네트워크·탈퇴 계정은 전역이 처리
>
>   toast.error(getApiErrorMessage(error)); // 4xx 는 빠짐없이 안내
>   if (getApiErrorStatus(error) === 404) router.replace(...); // 이탈이 필요한 status 만 추가 동작
> }
> ```
>
> **전역 net(③)이 커버하지 못하는 것** (= 개별에 반드시 남겨야 하는 것):
>
> - **낙관적 업데이트 롤백** — 전역은 토스트만, 상태 되돌림은 개별 `onMutate`/`onError`
> - **맞춤 4xx UX** — 이동/전용 다이얼로그/인라인 에러
> - **query(GET) 에러** — `MutationCache`는 mutation만 → `isError`/error boundary로 별도 처리
> - **react-query 밖 호출** — 생 `fetch`/`.then` (예: `getAuthUrl`)은 전역 net이 안 잡음 → 직접 `catch`

### ⑤ GET(query) 실패

> **query는 mutation과 다르게 다룬다. 전역 "토스트" 금지 — 전역은 "로깅"만.**
> 배경 refetch/retry가 실패할 때마다 토스트가 스팸되고, query 에러는 보통 그 자리(리스트 영역)에 인라인으로 보여야 하기 때문.

| 종류                                           | 처리                                                          | 작업            |
| ---------------------------------------------- | ------------------------------------------------------------- | --------------- |
| **suspense query** (`useSuspenseQuery` 등)     | throw → `app/error.tsx` 에러바운더리 (이미 있음)              | 추가 작업 없음  |
| **일반 query** (`useQuery`/`useInfiniteQuery`) | 컴포넌트에서 **`isError` 분기** → "불러오기 실패 + 재시도" UI | 해당 컴포넌트만 |
| **전역 `QueryCache.onError`**                  | **Sentry 로깅만** (토스트 X)                                  | 설정 1곳        |

- 일반 query는 **"빈 상태(데이터 없음)"와 "불러오기 실패"를 반드시 구분**해 표시할 것 (예: 알림 목록)
- 예외: **react-query 밖 수동 재조회**(예: `useTournament` 라운드 동기화)는 배경 refetch 스팸이 없고 재시도 액션이 유일한 복구 수단이라 토스트 허용
- **하지 말 것**:
  - ❌ query 전역 토스트 (배경 refetch 스팸)
  - ❌ 전역 `throwOnError: true` (리스트 일부 실패에도 화면 전체가 에러 페이지로) — 페이지 전체가 한 데이터에 의존하는 화면에서만 **개별적으로** 켤 것

---

## `status` vs `code` — 무엇으로 분기할까

서버가 모든 실패 응답에 `code`를 실어주면서 "status 대신 code로 다 분기해야 하나?"라는 질문이 생긴다.
**답은 아니다.** 둘은 답하는 질문이 다르다.

|              | 무엇을 답하나                                          | 어디에 쓰나            |
| ------------ | ------------------------------------------------------ | ---------------------- |
| **`code`**   | "무슨 일이 일어났나"                                   | **사용자 문구** (100%) |
| **`status`** | "이제 뭘 해야 하나" — 머무를까 / 이탈할까 / 재시도할까 | **동작 분기 1차**      |

### 규칙

1. **문구는 항상 `code`** — `getApiErrorMessage(error)` 하나로 통일. 호출부에서 문구를 직접 쓰지 않는다. 카탈로그에 없는 code는 generic fallback으로 흘러간다 (아래 구현 참고).
2. **동작 1차 분기는 `status`** — "머무를까 / 이탈할까 / 재시도할까"는 HTTP 시맨틱으로 충분하다.
   403/404/409가 전부 "이 화면에 더 못 있음 → 목록으로 replace"로 수렴한다면 code를 나열하지 않는다.
3. **`code`는 같은 status 안에서 동작이 갈릴 때만 2차 분기** — 아래 판단 기준 참고.
4. **`code` 분기에는 반드시 `else` fallback을 둔다** — 서버가 code를 추가해도 안전하게 흘러가도록.

> **판단 기준**: "같은 status인데 사용자가 가야 할 곳이 다른가?" → 예면 code 2차 분기, 아니면 status로 충분.

### 왜 전면 전환을 하지 않나

**문구 매핑은 틀려도 degrade되지만, 분기는 틀리면 조용히 깨진다.**

카탈로그에 없는 code가 오면 generic 문구로 흘러서 최악이 "덜 친절한 문구"다.
반면 동작 분기가 code 기반인데 매칭이 안 되면 **사용자가 엉뚱한 화면으로 간다.** 타입 체크로도 안 잡힌다.

실제로 서버 코드 사전은 자주 움직인다 — `LINK-001~003`이 한 칸씩 당겨지고, 접두사 4개(`IMG_PROXY`→`PROXY` 등)가 통째로 바뀌고, 코드 여러 개가 삭제된 전례가 있다.
그 변동을 **문구 계층에서만** 흡수해야 라우팅까지 흔들리지 않는다.

### code 2차 분기가 필요한 곳 (현재)

같은 status에 서로 다른 사용자 행동이 묶여 있는 케이스. `api-docs`의 엔드포인트별 응답 설명으로 확인할 수 있다.

| 엔드포인트                     | status | code                              | 동작                          |
| ------------------------------ | ------ | --------------------------------- | ----------------------------- |
| `POST /tournaments/{id}/start` | 409    | `TOURNAMENT-013`·`TOURNAMENT-014` | 토스트 (준비 안 된 상품 안내) |
|                                |        | 그 외 (이미 시작됨)               | 매치 화면으로 이동            |
| `POST /tournaments/{id}/join`  | 409    | `TOURNAMENT-022` (이미 참여 중)   | 해당 토너먼트로 진입          |
|                                |        | `TOURNAMENT-030` (인원 초과)      | 인원 마감 다이얼로그          |
|                                |        | 그 외 (만료·PENDING 아님)         | 링크 만료 다이얼로그          |

### status로 충분한 곳 (바꾸지 말 것)

- **401 인터셉터** — code(`AUTH-001`/`COMMON-UNAUTHORIZED`/`OAUTH-*`)로 바꾸면 refresh 로직이 코드 사전에 결합된다. 401은 그냥 401이다.
- **5xx·네트워크 재시도 판단** — `ERR_NETWORK`는 응답 body 자체가 없어 서버 `code`가 존재하지 않는다.
- **RSC layout의 `redirect`/`notFound`** — 404 → `notFound()`는 HTTP 시맨틱 그 자체다.
- **원인이 하나의 동작으로 수렴하는 4xx 묶음** — 아이템 수정·삭제의 403/404/409 등.

---

## 함정: `mutate` 레벨 `onError`는 전역 양보 조건이 아니다

전역 4xx fallback의 양보 조건은 `if (mutation.options.onError) return` 인데,
여기서 `mutation.options.onError`는 **`useMutation({ onError })`(훅 레벨)만** 가리킨다.

```ts
// ❌ 전역이 양보하지 않는다 → 토스트 2개
const { mutate } = useMutation({ mutationFn }); // 훅 레벨 onError 없음
mutate(vars, {
  onError: () => toast.error('실패했어요'), // mutate 레벨 — 전역 fallback과 함께 실행됨
});

// ✅ 훅 레벨에서 4xx를 책임지고, 화면 고유 동작만 콜백으로 위임
export const usePostJoin = ({ onConflict }: { onConflict?: () => void } = {}) => {
  return useMutation({
    mutationFn: postJoin,
    onError: error => {
      if (isAxiosError(error) && error.response?.status === 409) {
        onConflict?.();
        return;
      }
      toast.error(getApiErrorMessage(error));
    },
  });
};
```

> 에러 처리는 **훅 레벨 `onError`에 둔다.** 화면마다 달라지는 부분(다이얼로그 열기 등)은
> 훅 파라미터 콜백으로 받아서 위임한다. `mutate` 레벨 `onError`에 에러 처리를 넣으면 전역과 중복된다.

---

## 개발 규칙 (체크리스트)

- [ ] mutation 훅의 `onError`는 **`if (isGlobalNetError(error)) return;` 으로 시작**한다 — 전역이 가져간 것(401·5xx·네트워크·탈퇴 계정)을 개별에서 다시 다루지 않는다
- [ ] 전역이 새로 가져가는 케이스가 생기면 **`utils/apiError.ts` 만 고친다** — 개별 훅에 조건을 흩뿌리면 누락 시 조용히 중복 처리된다
- [ ] mutation 훅의 `onError`는 **4xx만** 분기한다. `status === 500` / `else`로 5xx를 토스트하지 않는다 (전역이 담당)
- [ ] 화면 진입 조건(로그인/멤버/존재)인 4xx는 layout에서 처리한다
- [ ] "정상 UI에선 도달 불가"한 status는 개별 분기하지 않는다 (전역 안전망 + Sentry가 덮음)
- [ ] 일반 query는 `isError`를 분기해 에러 UI를 노출한다
- [ ] 에러 메시지는 `getApiErrorMessage(error)`로 통일한다 — 호출부에 문구를 직접 쓰지 않는다
- [ ] 동작 분기는 status가 1차. `code` 분기는 "같은 status인데 갈 곳이 다를 때"만 쓰고, `else` fallback을 둔다
- [ ] 에러 처리는 **훅 레벨 `onError`**에 둔다 (`mutate` 레벨에 두면 전역 fallback과 토스트가 중복된다)

---

## 유틸: 에러 분류 (`utils/apiError.ts`)

"이 에러를 누가 처리하는가"를 한 곳에 모은다. 개별 훅이 각자 status를 나열하면 전역이 가져간 케이스가 늘 때마다 누락이 생긴다.

| 함수                                    | 용도                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `isGlobalNetError`                      | **개별 `onError` 의 첫 줄** — 전역이 처리하는 에러면 `return`            |
| `isServerOrNetworkError`                | 5xx·네트워크만 (react-query 밖 호출에서 "링크 오류 vs 서버 오류" 구분용) |
| `isWithdrawnAccountError`               | 탈퇴 계정(409 `USER-003`) — 전역 안전망이 스킵 조건으로 사용             |
| `getApiErrorStatus` / `getApiErrorCode` | axios 파싱 없이 status·code 접근 (없으면 `null`)                         |

---

## 유틸: `getApiErrorMessage(error)`

에러 → 사용자 문구 변환을 한 곳으로 일원화한다.
문구 카탈로그는 web·app 공유를 위해 `@piki/core`에 두고, web은 axios 파싱만 담당한다.

```text
packages/core/src/
├── consts/errorCode.ts            # ERROR_MESSAGE_MAP (code → 문구) + fallback 상수
├── types/error.ts                 # ErrorCodeT, ApiErrorCodeT
└── utils/getErrorMessageByCode.ts # 순수 조회 헬퍼 (없으면 null)
```

```ts
// apps/web/src/utils/getApiErrorMessage.ts
// 우선순위: code → generic (서버 detail 은 사용자에게 노출하지 않는다)
export const getApiErrorMessage = (error: unknown): string => {
  if (!isAxiosError<ApiErrorResponseT>(error)) return DEFAULT_ERROR_MESSAGE;

  const messageByCode = getErrorMessageByCode(error.response?.data?.code);
  if (messageByCode) return messageByCode;

  const status = error.response?.status;
  if (!status || status >= 500) return SERVER_ERROR_MESSAGE;

  return DEFAULT_ERROR_MESSAGE;
};
```

> 카탈로그 원본은 [`api-docs`](https://dev.api.piki.day/v3/api-docs)의 `info.description`이다.
> 서버가 코드를 추가·삭제·개명하므로 **주기적으로 대조**할 것. 클라이언트가 도달할 수 없는
> 서버 간 통신 코드(`APPLE-*`, `EXTRACTOR-*`, `SNAPSHOT-*`)는 카탈로그에서 제외한다.

---

## 전역 안전망 최종 코드 (`utils/queryClient.ts`)

```ts
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getApiErrorStatus,
  isServerOrNetworkError,
  isWithdrawnAccountError,
} from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

const makeQueryClient = () =>
  new QueryClient({
    // mutation — 사용자 액션 실패: 토스트 + 로깅
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        // 401·탈퇴 계정은 인터셉터가 refresh·redirect 로 처리 → 이중 토스트 방지
        if (getApiErrorStatus(error) === 401 || isWithdrawnAccountError(error)) return;

        if (isServerOrNetworkError(error)) {
          toast.error(getApiErrorMessage(error));
          // Sentry.captureException(error);
          return; // 5xx는 전역 독점 → 개별은 5xx 토스트 금지
        }
        // 4xx: 개별 onError 있으면 양보, 없으면 generic fallback
        if (mutation.options.onError) return;
        toast.error(getApiErrorMessage(error));
      },
    }),
    // query — 데이터 fetch 실패: 토스트 X, 로깅만 (표시는 boundary/isError)
    queryCache: new QueryCache({
      onError: _error => {
        // Sentry.captureException(_error); // 로깅만! 토스트 금지
      },
    }),
    defaultOptions: {
      queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false },
    },
  });
```

> ⚠️ `MutationCache.onError`와 개별 `onError`는 **둘 다 실행**된다. 그래서 개별 훅이 5xx를 토스트하면 전역과 중복된다 → 개별은 반드시 4xx만.
> ⚠️ `QueryCache.onError`는 **로깅 전용**. 토스트를 넣으면 배경 refetch마다 스팸된다.

---

## "도달 불가" 케이스는 어떻게?

정상 UI 흐름에선 발생할 수 없는 status(예: 남의 위시 403)는:

- **개별 전용 UX를 만들지 않는다** (죽은 코드 방지)
- 대신 **전역 안전망 + Sentry**로 덮어 "조용히 실패/크래시"만 막는다
- 만약 Sentry에 실제로 찍히면 → "불가능하다던 가정이 깨졌다"는 신호로 삼아 원인 추적

원칙 한 줄: **명시적 처리는 "도달 가능 + 사용자 행동이 바뀌는 것"만. 그 외 전부는 전역 안전망으로 "조용히 실패 금지".**
