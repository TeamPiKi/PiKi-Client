/** 페이지 진입 시 `?action=<value>` 로 UI/토스트 등을 실행할 때 사용 */
export const QUERY_ACTION = {
  KEY: 'action',
  VALUE: {
    OPEN_GET_ITEM_DIALOG: 'get-item',
    WELCOME_JOIN: 'welcome-join',
    SESSION_EXPIRED: 'session-expired',
    WITHDRAWN_ACCOUNT: 'withdrawn-account', // 탈퇴한 계정(USER-003) 세션으로 API 를 호출한 경우
    SOCIAL_LOGIN_ERROR: 'social-login-error',
    MEMBER_ONLY: 'member-only', // 회원 전용 경로로 redirect 하려는 경우 노출되는 안내 토스트
    SCROLL_TO_LAST: 'scroll-to-last', // 토너먼트 생성 화면 진입 시 마지막 아이템 바구니로 스크롤
    TOURNAMENT_ITEM_NOT_FOUND: 'tournament-item-not-found', // 삭제된 토너먼트 아이템 접근 시 create 로 폴백 후 토스트
    TOURNAMENT_FORBIDDEN: 'tournament-forbidden', // 참여 권한 없는 토너먼트 접근 시 홈으로 폴백 후 토스트
    TOURNAMENT_NOT_FOUND: 'tournament-not-found', // 삭제된 토너먼트에 액션을 시도한 경우 홈으로 폴백 후 토스트
    TOURNAMENT_NOT_STARTABLE: 'tournament-not-startable', // 시작 조건 미충족 상태로 /match 직접 진입 시 create 로 폴백 후 토스트
  },
} as const;

export type QueryActionValueT = (typeof QUERY_ACTION.VALUE)[keyof typeof QUERY_ACTION.VALUE];

/** `action` 과 달리 값이 고정되지 않은(리소스 id 등) 쿼리 파라미터 키 */
export const QUERY_PARAM = {
  HIGHLIGHT_TOURNAMENT_ITEM: 'highlightItem', // 알림 클릭시 강조할 토너먼트 아이템
} as const;
