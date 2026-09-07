/** NOTE: 수정 시 src/utils/getRouteType.ts 도 함께 수정 필요 */
export const ROUTES = {
  /** 1. Public (Anonymous) */
  ROOT: '/',
  ONBOARDING: '/onboarding',
  LOGIN: '/login',
  SOCIAL_LOGIN_CALLBACK: (provider: string) => `/auth/callback/${provider}`,
  TERMS: '/terms',
  POLICY: '/privacy',
  /** iOS Universal Link 목적지 — 여기가 열렸다는 건 앱 미설치라는 뜻이라 앱스토어로 보낸다 */
  OPEN_APP: '/open-app',

  /** 2. Member & Guest */
  HOME: '/home',
  TOURNAMENT_JOIN_BY_CODE: '/tournament/join',
  TOURNAMENT_JOIN_BY_LINK: (id: number) => `/tournament/join/${id}`,
  NOTIFICATION: '/notification',
  MYPAGE: '/mypage',
  MYPAGE_EDIT: '/mypage/edit',
  PLAY_FROM_LINK: (sourceTournamentId: number) => `/play/${sourceTournamentId}`,
  TOURNAMENT_HISTORY: '/archive/tournament',

  /** 3. Member Only */
  WISHLIST: '/archive/wish',
  WISH_EDIT: (wishId: number) => `/archive/wish/${wishId}`,
  MYPAGE_WITHDRAW: '/mypage/withdraw',

  /** 4. Authorized Guest or Member */
  TOURNAMENT_CREATE: (tournamentId: number) => `/tournament/${tournamentId}/create`,
  TOURNAMENT_ADD_ITEM_BY_WISH: (tournamentId: number) =>
    `/tournament/${tournamentId}/create/by-wish`,
  TOURNAMENT_ITEM_EDIT: (tournamentId: number, itemId: number) =>
    `/tournament/${tournamentId}/item/${itemId}`,
  TOURNAMENT_LOADING: (tournamentId: number) => `/tournament/${tournamentId}/loading`,
  TOURNAMENT_MATCH: (tournamentId: number) => `/tournament/${tournamentId}/match`,
  TOURNAMENT_RESULT: (tournamentId: number) => `/tournament/${tournamentId}/result`,
  TOURNAMENT_GROUP_RESULT: (tournamentId: number) => `/tournament/${tournamentId}/result/group`,
} as const;
