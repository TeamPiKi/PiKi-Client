# API Status Code 프론트 대응 전수조사

> `api-docs`(OpenAPI 스펙)에 정의된 모든 엔드포인트의 status code를 기준으로, 웹 프론트(`apps/web`)의 실제 대응 여부를 조사한 결과입니다.
> 범례: ✅ 대응됨 · ⚠️ 부분/애매(status 구분 없이 뭉뚱그림·전역 fallback만 등) · ❌ 미대응(무처리·dead code·전역 안전망 밖) · N/A 프론트 무관
>
> **최종 갱신: 2026-08-02** — 에러 코드 카탈로그 도입(`@piki/core`) 및 개별 `onError` 정리 반영.
> 처리 규약은 [`error-handling-policy.md`](./error-handling-policy.md) 참고.

## 전역 동작 (공통 전제)

- **401**: `apis/client.ts` 인터셉터가 토큰 refresh 후 자동 재시도, 실패 시 로그인 리다이렉트 → clientApi 호출은 사실상 401 전역 커버. **단 로그인 요청(`/auth/login/*`·`/auth/guest`)은 세션이 없어 refresh 대상에서 제외** — 이 401 은 로그인 실패이므로 개별 `onError` 가 안내한다. **`serverApi`(SSR) 응답 인터셉터는 401 세션 만료 리다이렉트(`?action=session-expired`)·409 `USER-003` 리다이렉트·5xx 수집을 하므로** 서버 렌더 경로의 나머지 4xx는 그대로 throw.
- **409 `USER-003`(탈퇴한 계정)**: `clientApi` 인터셉터가 토큰 정리 + 로그인 리다이렉트(`?action=withdrawn-account`), `serverApi` 인터셉터가 SSR 경로에서 동일하게 `redirect`.
- **Mutation 전역 안전망** (`utils/queryClient.ts` `MutationCache.onError`):
  - **5xx·네트워크**: 항상 `getApiErrorMessage` 토스트 + Sentry (개별 `onError` 유무와 무관)
  - **4xx**: 개별 `onError`가 **없으면** generic fallback 토스트 · **있으면** 전역이 양보 → 미처리 status는 토스트 없음
  - **401**: 이중 토스트 방지를 위해 전역 스킵 (인터셉터가 처리)
- **잡히지 않은 throw / 5xx (query·비-mutation)**: Next.js error boundary(`app/error.tsx`, `app/global-error.tsx`)의 "오류가 발생했어요" 페이지로 fallback.
- **`useSuspenseQuery` 기반 GET**: per-status 처리 없이 에러 시 error boundary로 fallback.
- **일반 `useQuery`/`useInfiniteQuery`**: QueryClient에 `throwOnError` 미설정(`utils/queryClient.ts`) → 에러가 boundary로도 안 가고, 컴포넌트가 `isError`를 안 보면 빈 상태로 표시될 수 있음. **QueryCache.onError는 Sentry 로깅만** (토스트 없음).
- **에러 토스트**: sonner(`@/components/toast`). 문구는 `getApiErrorMessage(error)` 한 곳으로 통일 — `code` → generic 순서로 `@piki/core` 카탈로그에서 가져온다. 서버 `detail` 은 사용자에게 노출하지 않는다.
- **개별 `onError` 규약**: 4xx 전부 책임(토스트를 status 분기 밖에 둔다) · 전역이 가져간 것(401·5xx·네트워크·탈퇴 계정)은 `if (isGlobalNetError(error)) return;` 한 줄로 위임 (`utils/apiError.ts`).

---

## 🚨 남은 미대응 요약

> mutation 분류 기준: `MutationCache.onError` 전역 안전망과의 관계. **로컬 맞춤 UX 없음** ≠ **사용자 피드백 완전 부재**.

### A. 로컬 맞춤 UX 없음 (전역 fallback 토스트는 보장)

개별 `onError` 없음 → 4xx는 카탈로그 문구 토스트, 5xx·네트워크는 전역 토스트. **status별 분기·라우팅·UI 복구는 없음.**

| 위치                       | 문제                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| `useDeleteTournament.ts`   | 삭제 실패(403/404/409) — 토스트만, 권한/상태별 복구 없음                          |
| `useDeleteWishes.ts`       | 다건 삭제 실패(400/403) — 동일                                                    |
| `usePostWishRefresh.ts`    | 새로고침 실패(400/403/404/409) — 동일 (`WISH-008` 은 보정 화면 유도가 자연스러움) |
| `usePostCreateTournament`  | 생성 400 — 토스트만                                                               |
| `usePostGuestLogin`        | 게스트 로그인 실패 — 토스트만, 재시도 UX 없음                                     |
| `usePostNotificationsRead` | 읽음 400 — 토스트만 (invalidate 전 실패 시 배지 불일치 가능)                      |

### B. 사용자 피드백 완전 부재 (mutation 전역 안전망 밖)

| 위치              | 문제                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `useFcmTokenSync` | mutation 아님 — `.catch(console.error)`만 (백그라운드 동작이라 의도적) |

> `useGetNotifications` 는 대응 완료 — `NotificationContent` 가 `isError` 분기로 에러 상태 카드(재시도 버튼)를 노출한다.

### C. 클라 사전검증 부재

| 위치                  | 문제                                              |
| --------------------- | ------------------------------------------------- |
| `PATCH /users/me` 413 | 업로드 전 용량 체크 없이 서버 413 토스트에만 의존 |

### D. 미구현·Dead code

| 위치                  | 문제                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **미구현 엔드포인트** | `GET /wishlists/{id}/history`(가격 히스토리), `GET /image-proxy`, `GET /announcements`, `GET /announcements/{id}`, `GET /tournaments/{id}/play-link-info` — 호출 코드 자체 없음 |
| **Dead code**         | `POST /tournaments/{id}/join/guest` — api/훅 정의만 있고 소비처 없음                                                                                                            |

### E. 서버에 요청할 것

| 코드             | 문제                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TOURNAMENT-005` | "PENDING 아님" 하나로 **IN_PROGRESS(진행 중)** 와 **COMPLETED(완료)** 를 모두 덮는다. 클라가 사유별 안내를 못 하고 이동할 화면도 code 로 못 고른다 → **두 코드로 분리 요청.**<br>현재는 `usePostTournamentStart` 409 fallback 이 매치 화면으로 push 하고, `match/page.tsx`(RSC)가 COMPLETED → 결과로 다시 redirect 해서 화면만 겨우 맞춰지는 상태다. |

---

### ✅ 이번에 해소된 항목

| 항목                                                                                                   | 처리                                                            |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `usePatchWish` 400 · `usePatchTournamentItem` 400 · `usePostWishOCR`/`useDeleteWish` 409 등 미처리 4xx | 토스트를 status 분기 밖으로 빼 4xx 전부 안내                    |
| `usePatchMe`·`useDeleteMe`·`usePostTournamentItemsByWish`·`usePostJoin` 등 5xx 중복 토스트             | 401·5xx 를 전역에 위임                                          |
| `usePostRecordMatch`·`usePostPlayLink`·`usePatchInviteExpiry` mutate 레벨 토스트                       | 훅 레벨 `onError` 로 이동 (전역 fallback 과 중복 제거)          |
| `usePostWishLink`·`usePostTournamentItemLink` 의 `throw error`                                         | 5xx 를 개별에서 다시 던지던 dead code 제거                      |
| `getAuthUrl` 실패 무피드백                                                                             | `catch` + 카탈로그 문구 토스트                                  |
| 하드코딩 에러 문구                                                                                     | 전부 `getApiErrorMessage` 로 일원화                             |
| 5xx 문구 미구분                                                                                        | 500/502/503 코드별 문구 분리 + `app/error.tsx` 도 카탈로그 사용 |
| `InviteTournamentDialog` 서버 오류 오안내                                                              | 5xx 에 "유효하지 않은 코드" 다이얼로그가 뜨던 문제 수정         |
| 탈퇴한 계정(`USER-003`) 세션                                                                           | client/server 인터셉터에서 토큰 정리 후 로그인 유도             |

---

## 🔐 Auth

### POST /api/v1/auth/token/refresh · 200, 400, 401

- 200: ✅ 웹뷰는 토큰 쿠키/브릿지 저장·브라우저는 Set-Cookie·서버는 쿠키맵 갱신 후 원 요청 재시도
- 400: ✅ throw → 로그인 리다이렉트(인터셉터/서버 catch) — status 구분 없이 일괄
- 401: ✅ 400과 동일 (throw → 로그인 리다이렉트)

### POST /api/v1/auth/logout · 200, 401

- 200: ✅ 쿠키 삭제 + `queryClient.clear()` + 로그인으로 replace
- 401: ✅ 인터셉터 refresh, 실패해도 서버 액션이 쿠키 강제 삭제 → 로그아웃 보장

### POST /api/v1/auth/login/{provider} · 200, 400, 401, 502

- 200: ✅ analytics 로깅 + `['me']` invalidate + redirect
- 400 / 401: ✅ 로그인 페이지로 replace + `?action=social-login-error` 안내 토스트
- 502: ✅ 전역 안전망이 카탈로그 문구 토스트 → 액션 쿼리 없이 이동해 중복 방지

### POST /api/v1/auth/guest · 201

- 201: ✅ `['me']` invalidate + (웹뷰) 쿠키/브릿지 저장 + redirect / 서버는 미인증 시 자동 게스트 로그인
- 실패: ⚠️ 클라 훅 `usePostGuestLogin`에 로컬 onError 없음 → 4xx는 전역 generic 토스트, 맞춤 UX(재시도·로그인 유도) 없음

### POST /api/v1/auth/apple/notifications · 200, 401, 502

- N/A: 서버-서버 웹훅(Apple→백엔드), 프론트에 호출 코드 없음

### POST /api/v1/auth/apple/callback · 302

- 302: ✅(간접) 백엔드 OAuth 브릿지가 `/auth/callback/apple`로 리다이렉트 → `CallbackHandler`가 후속 처리 (프론트가 302 직접 처리하진 않음)

### GET /api/v1/auth/{provider}/url · 200, 400

- 200: ✅ 반환 url로 이동(kakao/google/apple)
- 400: ✅ mutation 밖 호출이라 `try/catch` + `getApiErrorMessage` 토스트 (`OAUTH-003`)

---

## 💛 Wishlist

### GET /api/v1/wishlists (목록) · 200, 400, 401, 403

- 200: ✅ `mapWishlist`로 items/커서 매핑
- 400 / 403: ⚠️ 개별 처리 없음 — suspense query throw → error boundary
- 401: ✅ 전역 인터셉터

### POST /api/v1/wishlists (URL 등록) · 201, 400, 401, 403, 409

- 201: ✅ analytics + `['wishlists']` invalidate + archive 이동
- 400: ✅ 카탈로그 문구 토스트 (`LINK-001~003`)
- 401: ✅ 전역 인터셉터
- 403: ✅ 토스트 + (게스트) 로그인 페이지 replace — 이미지 등록과 동일 동선
- 409: ✅ `WISH-009`(중복 상품)는 응답 `data.wishId` 로 "보러가기" 액션 토스트 → 위시 상세 이동 (`wishId` 가 없으면 문구만). 링크 다이얼로그는 인라인 대신 닫는다 / `USER-003` 은 인터셉터가 세션 정리

### DELETE /api/v1/wishlists (다건 삭제) · 200, 400, 401, 403

- 200: ✅ invalidate + 성공 토스트 "선택한 위시를 삭제했어요"
- 400 / 403: ⚠️ 로컬 onError 없음 → 4xx 전역 generic 토스트 (status별 분기·복구 없음)
- 401: ✅ 전역 인터셉터

### POST /api/v1/wishlists/{wishId}/refresh (새로고침) · 200, 400, 401, 403, 404, 409

- 200: ✅ invalidate + `router.back()`
- 400 / 403 / 404 / 409: ⚠️ 로컬 onError 없음 → 4xx 전역 generic 토스트 (status별 분기·복구 없음)
- 401: ✅ 전역 인터셉터

### POST /api/v1/wishlists/images (이미지 등록/OCR) · 201, 400, 401, 403, 502

- 201: ✅ analytics + invalidate + archive 이동
- 400: ✅ 카탈로그 문구 토스트(개수/형식/크기 초과)
- 401: ✅ 전역 인터셉터
- 403: ✅ 토스트 + (게스트) 로그인 페이지 replace
- 409: ✅ 토스트 / `USER-003` 은 인터셉터가 세션 정리
- 502: ✅ 전역 `MutationCache.onError` 단독 처리 (로컬 onError는 401·5xx 를 위임)

### GET /api/v1/wishlists/{wishId} (단건) · 200, 401, 403, 404

- 200: ✅ data 반환
- 401: ✅ 전역 인터셉터
- 403 / 404: ⚠️ 개별 처리 없음 — suspense query throw → error boundary

### DELETE /api/v1/wishlists/{wishId} (단건 삭제) · 200, 401, 403

- 200: ✅ invalidate + 성공 토스트 + archive replace
- 401: ✅ 전역 인터셉터
- 403 / 409: ✅ 카탈로그 문구 토스트 (권한 없음 · 탈퇴한 계정)

### PATCH /api/v1/wishlists/{wishId} (복구/추출 보정) · 200, 400, 401, 403, 404, 409, 502

- 200: ✅ invalidate + `router.back()`
- 400: ✅ 토스트 (`ITEM-003` 이름 미입력 등)
- 401: ✅ 전역 인터셉터
- 403 / 404: ✅ 토스트 + 위시리스트 replace
- 409: ✅ `USER-003` 뿐이라 인터셉터가 세션 정리 (개별 분기 없음)
- 502: ✅ 전역 `MutationCache.onError` 단독 처리

### GET /api/v1/wishlists/{wishId}/history (가격 히스토리) · 200, 401, 403, 404

- ❌ **프론트 미구현** — ENDPOINTS 상수·api·hook 전무 (기존 'history'는 전부 토너먼트 기록)

---

## 🏆 Tournament / Tournament Item

### GET /api/v1/tournaments (목록) · 200, 401

- 200: ✅ 데이터 반환 / 401: ✅ 전역(서버렌더 미인증은 throw→boundary) / 기타 ⚠️ error boundary

### POST /api/v1/tournaments (생성) · 201, 400, 401

- 201: ✅ analytics + list invalidate + create 이동
- 400: ⚠️ 로컬 onError 없음 → 4xx 전역 fallback 토스트
- 401: ✅ 전역

### POST /api/v1/tournaments/{id}/start · 200, 400, 401, 403, 404, 409

- 200: ✅ 응답 tournamentId로 라우팅
- 400 / 403 / 404: ✅ 카탈로그 문구 토스트
- 401: ✅ 전역
- 409: ✅ code 2차 분기 — `TOURNAMENT-013`·`TOURNAMENT-014`(준비 안 된 상품)는 토스트만, 그 외는 매치 화면으로 이동
  - ⚠️ 그 "그 외"가 `TOURNAMENT-005` 하나라 진행 중/완료를 구분하지 못한다 (위 §E 참고)

### POST /api/v1/tournaments/{id}/play-link · 200, 401, 403, 404, 409

- 200: ✅ 링크 생성 후 공유
- 401: ✅ 전역
- 403 / 404 / 409: ✅ 훅 레벨 `onError` 에서 카탈로그 문구 토스트 (소비처는 공유 플로우 중단만 담당)

### POST /api/v1/tournaments/{id}/matches (매치 결과) · 200, 400, 401, 403, 404, 409

- 200: ✅ 캐시 갱신/라운드 전환/결승 시 result 이동
- 400 / 403 / 404 / 409: ✅ 훅 레벨 `onError` 카탈로그 문구 토스트 + 화면별 복구(카드 선택 락 해제·서버 재동기화)
- 401: ✅ 전역

### POST /api/v1/tournaments/{id}/join (인증 참여) · 200, 400, 401, 404, 409

- 200: ✅ create 페이지(WELCOME_JOIN)로 이동
- 400 / 404: ✅ 카탈로그 문구 토스트 / InviteClient 경로는 `state='invalid'` 화면
- 401: ✅ 전역
- 409: ✅ code 2차 분기 — `TOURNAMENT-022`(이미 참여) 진입 · `TOURNAMENT-030`(인원 초과) 다이얼로그 · `TOURNAMENT-021`/`TOURNAMENT-005`(만료·시작됨) `LINK_EXPIRED` 다이얼로그 · 그 외 카탈로그 문구 토스트

### POST /api/v1/tournaments/{id}/join/guest (게스트 참여) · 201, 400, 404, 409

- ❌ **Dead code** — api/훅 정의만 있고 소비처 없음, 전 status 미대응

### POST /api/v1/tournaments/{id}/items/wish (위시 추가) · 200, 400, 401, 403, 404, 409

- 200: ✅ invalidate + create 이동
- 400 / 403 / 404 / 409: ✅ 카탈로그 문구 토스트 (401·5xx 는 전역 위임)

### POST /api/v1/tournaments/{id}/items/link (URL 추가) · 200, 400, 401, 403, 404, 409

- 200: ✅ invalidate
- 400: ✅ 카탈로그 문구 토스트
- 403 / 404 / 409: ✅ 토스트 + 홈으로 replace (이미지 등록과 동일 동선)
- 401: ✅ 전역 / 5xx: ✅ 전역 안전망 (개별에서 다시 throw 하던 dead code 제거)

### POST /api/v1/tournaments/{id}/items/images (이미지 OCR) · 200, 400, 401, 403, 404, 409, 502

- 200: ✅ invalidate
- 400: ✅ 카탈로그 문구 토스트
- 401: ✅ 전역
- 403 / 404 / 409: ✅ 토스트 + `router.replace(HOME)`
- 502: ✅ 전역 `MutationCache.onError`가 `status>=500` 토스트 처리

### POST /api/v1/tournaments/{sourceId}/from-play-link · 200, 401, 404, 409

- 200: ✅ 상태별 라우팅(create/match/result)
- 401: ✅ 전역 + 401/400 시 게스트 자동 발급 후 재시도
- 404 / 409: ✅ `state='expired'` → "플레이 링크 유효하지 않음" 안내 화면(통합)

### GET /api/v1/tournaments/{id}/items/{itemId} (아이템 단건) · 200, 401, 403, 404

- 200: ✅ / 401: ✅ 전역 / 403 · 404: ❌ 개별 미처리 → error boundary

### DELETE /api/v1/tournaments/{id}/items/{itemId} · 200, 401, 403, 404, 409

- 200: ✅ invalidate + create 페이지 replace
- 401: ✅ 전역
- 403 / 404 / 409: ✅ 카탈로그 문구 토스트 + create replace / 5xx: ✅ 서버오류 토스트

### PATCH /api/v1/tournaments/{id}/items/{itemId} · 200, 400, 401, 403, 404, 409, 502

- 200: ✅ invalidate + `router.back()`
- 400: ✅ 카탈로그 문구 토스트 (`ITEM-003`)
- 401: ✅ 전역
- 403 / 404 / 409: ✅ 토스트 + create replace
- 502: ✅ 전역 `MutationCache.onError` 단독 처리

### PATCH /api/v1/tournaments/{id}/invite (초대 마감 수정) · 200, 400, 401, 403, 404, 409

- 200: ✅ invalidate + 성공 토스트
- 400 / 403 / 404 / 409: ✅ 훅 레벨 `onError` 카탈로그 문구 토스트 (소비처 mutate 레벨 토스트 제거 — 전역과 중복이었음)
- 401: ✅ 전역

### GET /api/v1/tournaments/{id} (단건) · 200, 401, 403, 404

- 200: ✅ / 401: ✅ 전역 / 403 · 404: ❌ 개별 미처리 → error boundary

### DELETE /api/v1/tournaments/{id} · 200, 401, 403, 404, 409

- 200: ✅ invalidate + 성공 토스트
- 401: ✅ 전역
- 403 / 404 / 409 / 5xx: ⚠️ 로컬 onError 없음 → 4xx 전역 generic 토스트, 5xx 전역 토스트 (status별 분기·복구 없음)

### GET /api/v1/tournaments/{id}/play-link-info · 200, 404, 409

- ❌ **프론트 미구현** — 상수·호출 코드 없음

### GET /api/v1/tournaments/{id}/invite-preview · 200, 404, 409

- ❌ **프론트 미사용** — 참여 진입은 by-invite-code 단독으로 검증·미리보기를 처리한다

### GET /api/v1/tournaments/{id}/group-result · 200, 401, 403, 404, 409

- 200: ✅ / 401: ✅ 전역
- 403 / 404 / 409: ✅ 통합 대응 — prefetch 실패 무시 + "아직 친구 결과가 없어요" 안내 화면

### GET /api/v1/tournaments/by-invite-code · 200, 400, 409

- 200: ✅ join RSC 가 미리보기까지 그대로 사용 (별도 조회 없음)
- 400: ✅ 링크 진입·코드 입력 모두 `INVALID_CODE`(코드 불일치, CTA 홈 이동) — 링크 진입 문구는 디자인 확인 대기
- 409: ✅ code 2차 분기 — 링크 진입(join RSC)·코드 입력(홈 다이얼로그) 각자 인라인 처리, `TOURNAMENT-005` → `ALREADY_STARTED` · `TOURNAMENT-021`(만료) 및 그 외 → `LINK_EXPIRED`
  - 서버가 이 경로에서 던지는 409 는 위 두 코드뿐이다 (`checkJoinable(null)` — 인원 초과 `TOURNAMENT-030` 은 `POST /join` 단계에서만 발생)
  - ⚠️ `TOURNAMENT-005` 가 진행 중/완료를 한 코드로 덮어, 완료된 토너먼트에도 "이미 시작된" 안내가 나간다 (위 §E 참고)
- 401·5xx: ✅ 다이얼로그 없이 전역 위임 — 서버 오류를 "유효하지 않은 코드"로 오안내하던 문제 수정

---

## 👤 User

### GET /api/v1/users/me · 200, 401, 404

- 200: ✅ UserT 반환(`['me']`)
- 401: ✅ 전역(client) / 서버 경로는 인터셉터 없어 throw → boundary
- 404: ❌ 전용 처리 없음 — suspense query throw → error boundary
- 409(`USER-003` 탈퇴한 계정): ✅ client/server 양쪽 인터셉터가 세션 정리 후 로그인 유도

### DELETE /api/v1/users/me (회원 탈퇴) · 200, 401, 403, 404

- 200: ✅ 토큰 삭제 + `queryClient.clear()` + ROOT redirect
- 401: ✅ 전역
- 403 / 404: ✅ 카탈로그 문구 토스트 (`USER-007` 게스트 탈퇴 불가 등) + dialog 닫힘

### PATCH /api/v1/users/me (정보 수정) · 200, 400, 401, 403, 404, 409, 413, 502

- 200: ✅ `['me']` invalidate + `router.replace(MYPAGE)`
- 400 / 403 / 404: ✅ 카탈로그 문구 토스트
- 401: ✅ 전역
- 409: ✅ `USER-004`(닉네임 중복)는 `GET /users/nickname/check` 사전검증이 1차 — 경합 시 토스트 / `USER-003` 은 인터셉터가 세션 정리
- 413(이미지 용량 초과): ⚠️ **클라 사전 용량검증 없음** — 서버 413 토스트에만 의존
- 502: ✅ 전역 `MutationCache.onError` 단독 처리 (로컬은 401·5xx 위임 → 중복 해소)

### GET /api/v1/users/nickname/check · 200, 400, 401

- 200: ✅ `available` 판정, false면 인라인 에러 "이미 사용 중인 닉네임이에요."
- 400: ✅ `getApiErrorMessage` 문구를 인라인 필드 에러로 표시
- 401: ✅ 전역

---

## 🔔 Notification / FCM

### POST /api/v1/notifications/read · 200, 400, 401

- 200: ✅ `['notifications']` invalidate + 웹뷰 badge 업데이트
- 400: ⚠️ 로컬 onError 없음 → 4xx 전역 generic 토스트 (낙관적 이동 없음, invalidate 실패 시 배지 불일치 가능)
- 401: ✅ 전역

### GET /api/v1/notifications · 200, 400, 401

- 200: ✅ items/unreadCount/커서 페이지네이션
- 400: ❌ query — `throwOnError`·`isError` 미사용 → 빈 목록으로 표시될 수 있음 (토스트·boundary 없음)
- 401: ✅ 전역

### GET /api/v1/notifications/subscribe (SSE) · 200, 401

- 200: ✅ 이벤트별(notification/silent-sync) 토스트 + 쿼리 invalidate, 재시도 delay 리셋
- 401: ✅ onopen에서 `refreshClientToken()` 후 재연결, 실패 시 연결 중단
- (재연결/에러: ✅ 지수 backoff 수동 재연결, 초기 1s→최대 30s)

### POST /api/v1/fcm/tokens (등록/갱신) · 200, 400, 401

- 200: ✅ `device_id` 쿠키 저장
- 400: ❌ mutation 아님 — `.catch(console.error)`만, 사용자 UI 대응 없음
- 401: ✅ 전역

### DELETE /api/v1/fcm/tokens (기기 해제) · 200, 400, 401

- 200: ✅ 로그아웃 흐름 계속 진행
- 400: ⚠️ try/catch로 의도적 무시(FCM 해제 실패해도 로그아웃 진행)
- 401: ⚠️ serverApi에 인터셉터 없어 reject되나 catch가 삼킴

---

## 🖼️ Image Proxy / 📢 Announcement (전부 미구현)

### GET /api/v1/image-proxy · 200, 400, 401, 502

- ❌ **프론트 미구현** — 상수·호출 코드 없음 (이미지는 next Image/base-image로 직접 렌더)

### GET /api/v1/announcements · 200, 400, 401

- ❌ **프론트 미구현** — 관련 페이지/훅/api 전무

### GET /api/v1/announcements/{id} · 200, 401, 404

- ❌ **프론트 미구현**

---

> ℹ️ Dev 태그 엔드포인트(`/api/v1/dev/*`)는 개발·테스트 전용(운영 비활성)이라 조사 대상에서 제외했습니다.

---

## 📌 코드베이스 내 TODO 주석 (남은 작업)

> `apps/web/src` 전체에서 `TODO`/`FIXME` 주석을 수집한 목록입니다. 위 status 대응과 별개로 남아있는 작업들입니다.

### 에러 처리 관련 (위 status 조사와 직접 연결)

- `app/tournament/[id]/layout.tsx:32` — `notFound(); // TODO: 아직 미정` (토너먼트 404 처리 방식 미확정)
- ~~`InviteClient` 409 단일 타입 처리~~ → 서버가 `code` 를 내려주면서 `TOURNAMENT-022`/`TOURNAMENT-030`/만료 로 분기 완료

### UI / 페이지 미완성

- `app/global-error.tsx:13` — `// TODO: 임시 글로벌 에러 페이지 - 디자인 변경 필요`
- `app/archive/_components/FabMenu.tsx:18` — 아이템 추가 페이지 생기면 연결
- `components/dialog/index.tsx:68` — `{/** TODO: 수정 필요 */}`
- `components/header/ProfileHeaderIcon.tsx:42` — 버튼 액션 정해지면 활성화 예정 (현재 작동 안 하는 버튼 숨기려 주석 처리)

### 서버 API 의존 (백엔드 추가 대기)

- `components/tournament-card/MorePopover.tsx:89` — IN_PROGRESS 참여자 API 추가되면 친구 목록 보기 노출

### 리팩터링

- `app/mypage/_actions/logout.ts:24` — `serverApi.post(AUTH_LOGOUT)` 중복 호출 수정하기
