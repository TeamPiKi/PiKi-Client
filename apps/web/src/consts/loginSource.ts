/** 로그인 유입 지점 저장 키 */
export const LOGIN_SOURCE_KEY = 'piki:login-source';

/**
 * 로그인 유입 지점 — 가입 완료 이벤트의 `source` 파라미터로 실린다.
 *
 * 배너 노출·클릭 이벤트의 `location` 값과 같은 문자열을 쓴다.
 * 두 이벤트를 GA 에서 같은 차원으로 비교하기 위함이고, 지점이 늘면 여기에만 더한다.
 */
export const LOGIN_SOURCE = {
  /** 홈 토너먼트 목록 위 가로형 배너 */
  HOME_LIST: 'home_list',
  /** 홈 토너먼트 0개일 때 빈 상태 */
  HOME_EMPTY: 'home_empty',
  /** 토너먼트 결과(영수증) 하단 배너 */
  RESULT: 'result',
  /** 마이페이지 배너 */
  MYPAGE: 'mypage',
} as const;

export type LoginSourceT = (typeof LOGIN_SOURCE)[keyof typeof LOGIN_SOURCE];
