/**
 * GA4 / Firebase Analytics 이벤트 상수.
 *
 * 네이밍 규칙: snake_case, 40자 이내.
 * 파라미터: PII 금지(이메일/닉네임/실명), ID 만 보낸다.
 *
 * funnel 페어 정책:
 *  - `*_start`  사용자가 액션을 시작한 시점 (클릭 등) — 도달률 측정
 *  - `*_complete` API 성공 / 최종 도달 — 완료율 측정
 */
export const ANALYTICS_EVENT = {
  /** 가입 / 인증 */
  SIGN_UP_COMPLETE: 'sign_up_complete',

  /** 위시 등록 funnel */
  WISH_ADD_START: 'wish_add_start',
  WISH_ADD_COMPLETE: 'wish_add_complete',

  /** 홈 */
  HOME_VIEW: 'home_view',
  NEW_TOURNAMENT_CLICK: 'new_tournament_click',

  /** 토너먼트 funnel */
  TOURNAMENT_CREATE: 'tournament_create',
  TOURNAMENT_START: 'tournament_start',
  RESULT_VIEW: 'result_view',
  RESULT_SHARE_CLICK: 'result_share_click',
  RECEIPT_SHARE: 'receipt_share',

  /** 친구 초대 funnel */
  SOCIAL_INVITE_CLICK: 'social_invite_click',
  FRIEND_INVITE_SEND: 'friend_invite_send',
  FRIEND_JOIN: 'friend_join',
  GUEST_VISIT: 'guest_visit',

  /** 게스트 로그인 유도 배너 */
  GUEST_BANNER_VIEW: 'guest_banner_view',
  GUEST_BANNER_CTA_CLICK: 'guest_banner_cta_click',

  /** 설정 */
  INVITE_EXPIRY_CHANGE: 'invite_expiry_change',

  /** 앱 업데이트 유도 */
  APP_UPDATE_PROMPT_VIEW: 'app_update_prompt_view',
  APP_UPDATE_PROMPT_CLICK: 'app_update_prompt_click',
  APP_UPDATE_PROMPT_DISMISS: 'app_update_prompt_dismiss',

  /** 인앱 브라우저 탈출 — source(kakao|instagram|threads)·path 파라미터 */
  LANDING_VIEW: 'landing_view',
  LANDING_APP_OPEN: 'landing_app_open',
  LANDING_STORE_OPEN: 'landing_store_open',
  LANDING_WEB_CONTINUE: 'landing_web_continue',
} as const;

export type AnalyticsEventNameT = (typeof ANALYTICS_EVENT)[keyof typeof ANALYTICS_EVENT];
