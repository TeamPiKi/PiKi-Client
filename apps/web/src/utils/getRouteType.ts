import { ROUTES } from '@/consts/route';
import type { RouteTypeT } from '@/types/route';

/** 토너먼트 참여 권한이 필요한 동적 라우트 패턴 */
const AUTHORIZED_ROUTE_PATTERNS = [
  /^\/tournament\/[^/]+\/create(?:\/by-wish)?$/,
  /^\/tournament\/[^/]+\/item\/[^/]+$/,
  /^\/tournament\/[^/]+\/loading$/,
  /^\/tournament\/[^/]+\/match$/,
  /^\/tournament\/[^/]+\/result(?:\/group)?$/,
] as const;

const matchesPath = (pathname: string, basePath: string) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

const isPublicRoute = (pathname: string) => {
  if (pathname === ROUTES.ROOT) return true;
  if (pathname === ROUTES.ONBOARDING) return true;
  if (pathname === ROUTES.TERMS) return true;
  if (pathname === ROUTES.POLICY) return true;
  if (pathname === ROUTES.LOGIN) return true;
  if (pathname === ROUTES.OPEN_APP) return true;
  if (/^\/auth\/callback\/[^/]+$/.test(pathname)) return true; // 소셜 로그인 콜백 경로

  return false;
};

const isMemberAndGuestRoute = (pathname: string) => {
  if (matchesPath(pathname, ROUTES.HOME)) return true;
  if (matchesPath(pathname, ROUTES.TOURNAMENT_JOIN_BY_CODE)) return true;
  if (matchesPath(pathname, '/play')) return true;
  if (matchesPath(pathname, ROUTES.NOTIFICATION)) return true;
  if (matchesPath(pathname, ROUTES.TOURNAMENT_HISTORY)) return true;
  if (pathname === ROUTES.MYPAGE) return true;
  if (pathname === ROUTES.MYPAGE_EDIT) return true;

  return false;
};

const isAuthorizedRoute = (pathname: string) =>
  AUTHORIZED_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));

const isMemberOnlyRoute = (pathname: string) => {
  if (pathname === ROUTES.MYPAGE_WITHDRAW) return true;
  if (matchesPath(pathname, ROUTES.WISHLIST)) return true;

  return false;
};

/** 현재 페이지의 권한 타입 반환 */
export const getRouteType = (pathname: string): RouteTypeT | null => {
  if (isPublicRoute(pathname)) return 'PUBLIC';
  if (isMemberAndGuestRoute(pathname)) return 'MEMBER_AND_GUEST';
  if (isAuthorizedRoute(pathname)) return 'AUTHORIZED';
  if (isMemberOnlyRoute(pathname)) return 'MEMBER_ONLY';

  return null;
};
