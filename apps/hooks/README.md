# @piki/hooks

iOS 앱 배포 이벤트(EAS Build·Submit, App Store Connect)를 받아 허거덩 봇으로 Discord에 알리는 웹훅 수신기.
`apps/web`과 분리된 **별도 Vercel 프로젝트**로 배포한다 — 봇 토큰을 서비스 런타임과 격리하고, 알림 코드가 프로덕트 배포에 묶이지 않게 하기 위함. (#618)

## 동작 방식 — 버전당 스레드 1개 (양 플랫폼)

첫 빌드 완료 이벤트가 배포알림 채널에 **루트 상태판**을 올리고 스레드를 연다.
이후 이벤트는 최근 메시지에서 진행 중(`📦`로 시작) 루트를 찾아 상태판을 수정하고 스레드에 로그를 쌓는다.
별도 DB 없이 Discord 메시지 자체가 상태 저장소다. 출시·반려 시 제목이 `🎉`/`❌`로 바뀌고 **스레드도 닫힌다(archive)**.

한 사이클에서 iOS·Android 를 같이 빌드하므로(`app-promote.yml` 이 빌드 3건을 돌린다) 상태판이 양 플랫폼을 함께 담는다.

```
📦 PiKi v1.3.0 배포 진행 중                 ← 이벤트마다 수정되는 상태판
• iOS 심사용: 빌드 45 TestFlight 준비 완료
• Android 심사용: 빌드 46 완료 — Play 제출 대기
• iOS 팀 테스트용: 빌드 47 TestFlight 준비 완료
• iOS 심사: 🎉 출시 완료
  └ 스레드: 🛠 빌드 완료 ×3 → ✅ ASC 업로드 완료 → ✅ TestFlight 준비 완료 → … → 🎉 출시 완료!
```

- **모든 줄은 `{플랫폼} {항목}`** — `production` 을 양 플랫폼으로 빌드하므로 프로필만으로 키를 잡으면 서로 덮어쓴다
- **빌드 줄이 단계를 따라 진행한다** — `빌드 완료` → `ASC 업로드 완료` → `TestFlight 준비 완료`. 별도 집계 줄을 두지 않는다
- **TestFlight 완료는 ASC API 로 빌드를 특정한다** — ASC 이벤트에는 빌드 식별 정보가 없어 `GET /v1/builds?filter[app]=…` 로 `VALID` 가 된 빌드 번호를 읽고 상태판의 `빌드 {번호}` 와 맞춘다. 키가 없거나 조회가 실패하면 중립 문구만 남긴다
- **`eas submit` 은 ASC 업로드까지다** — 심사 제출은 ASC 에서 사람이 눌러야 하므로, 심사용 빌드가 준비되면 담당자를 멘션한다
- **Android 는 빌드까지만** — Play 제출이 수동이라 빌드 완료 시 담당자를 멘션하고 aab 직접 다운로드 링크를 붙인다
- **멘션은 스레드 로그에만 실린다** — 상태판은 메시지 수정이라 Discord 가 알림을 보내지 않는다
- **심사 표시는 통과·출시·반려만** — 심사 대기는 알리지 않고, 수동/자동 출시 구분은 통과 후 전이 상태로 드러난다
- **원시 상태값은 노출하지 않는다** — `PREPARE_FOR_SUBMISSION` 같은 ASC 내부 코드는 로그에 남기지 않는다
- **무시 케이스** — 개발 빌드·취소·미매핑 상태·테스트 ping·미구독 이벤트는 200으로 조용히 응답 (재시도 유발 금지)

## 엔드포인트

| 경로 | 발신자 | 서명 검증 | 역할 |
| --- | --- | --- | --- |
| `POST /api/webhooks/eas-build` | EAS Build (BUILD 이벤트) | `expo-signature` — HMAC-SHA1 | 빌드 완료가 사이클(스레드)을 연다 |
| `POST /api/webhooks/eas` | EAS Submit (SUBMIT 이벤트) | `expo-signature` — HMAC-SHA1 | 심사 제출·TestFlight 업로드 기록 |
| `POST /api/webhooks/asc` | App Store Connect | `x-apple-signature` — HMAC-SHA256 | TestFlight 빌드 처리·심사 상태 전이 기록 |

## 런타임 요구사항

환경변수:

| 변수 | 용도 |
| --- | --- |
| `DISCORD_BOT_TOKEN` | 허거덩 봇 토큰 (GitHub Actions secret과 동일 값) |
| `DISCORD_DEPLOY_CHANNEL_ID` | 배포알림 채널 ID |
| `EAS_WEBHOOK_SECRET` | EAS 웹훅 서명 검증 키 (`eas webhook:create`에 넣은 값) |
| `ASC_WEBHOOK_SECRET` | ASC 웹훅 서명 검증 키 (ASC 웹훅 등록 시 입력한 Secret) |
| `EXPO_TOKEN` (선택) | EAS API로 빌드 프로필(심사용/팀 테스트용)·버전 조회. 없으면 해당 줄만 생략 |
| `ASC_API_ISSUER_ID` (선택) | ASC API — TestFlight 처리 완료를 어느 빌드인지 특정하는 데 쓴다 |
| `ASC_API_KEY_ID` (선택) | 같은 용도. 셋 중 하나라도 없으면 조회를 건너뛰고 중립 문구를 남긴다 |
| `ASC_API_PRIVATE_KEY_B64` (선택) | `.p8` 을 base64 로 넣는다 (`base64 -i AuthKey_*.p8`) |
| `DISCORD_PLAY_SUBMITTER_ID` (선택) | Android 빌드 완료 시 멘션할 Play 제출 담당자 |
| `DISCORD_APPSTORE_SUBMITTER_ID` (선택) | 심사용 빌드 TestFlight 준비 시 멘션할 심사 제출 담당자 |

봇에게 배포알림 채널의 **View Channel / Send Messages / Read Message History /
Create Public Threads / Send Messages in Threads** 권한이 필요하다 (루트 검색·스레드 기록).
스레드 닫기는 봇이 만든 스레드라 추가 권한 없이 되지만, 실패하면 **Manage Threads** 를 준다.

## 빌드 설정

번들할 것이 없는 순수 함수 프로젝트라 빌드 단계가 없다. Vercel 프로젝트 설정(대시보드)에서 관리한다 — 레포에 `vercel.json` 을 두지 않는다.

| 설정 | 값 | 이유 |
| --- | --- | --- |
| Framework Preset | Other | 프리셋 기본 빌드 명령·출력 경로가 끼어드는 것을 막는다 |
| Build Command (Override) | `echo skip` | 비워두면 Turborepo 자동 감지가 `turbo run build` 를 돌린 뒤 출력 디렉터리를 못 찾아 실패한다 |
| Output Directory (Override) | `public` | Vercel 은 출력 디렉터리가 없어도, 비어 있어도 거부한다 (`public/index.html` 이 안내 페이지 겸 채움) |
| Root Directory → Skip deployment | 켬 | `apps/hooks` 와 그 의존이 안 바뀐 커밋에서는 배포를 건너뛴다 (Ignored Build Step 은 Automatic 그대로) |

`api/**/*.ts` 는 이 설정과 무관하게 Root Directory 아래 `api/` 스캔으로 함수가 된다.

tsconfig 에 `noEmit` 을 두지 않는다 — Vercel 이 함수를 빌드할 때 이 tsconfig 를 그대로 쓰므로, `noEmit` 이면 JS 가 하나도 나오지 않아 모든 함수가 `FUNCTION_INVOCATION_FAILED` 로 죽는다 (`check-types` 는 `tsc --noEmit` 플래그로 검사한다). NodeNext ESM 이라 상대 import 에는 `.js` 확장자가 필요하다.

웹훅·Vercel 프로젝트 등록 등 1회성 셋업 진행 상황은 #618, 앱 승격 워크플로우는 #625 에서 관리한다.
