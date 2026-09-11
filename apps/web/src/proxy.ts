import { getTokenMaxAge, isTokenUnexpired } from '@piki/core';
import * as Sentry from '@sentry/nextjs';
import { type NextRequest, NextResponse } from 'next/server';

import { postTokenRefreshServer } from './apis/postTokenRefresh';
import { postGuestLoginServer } from './app/login/_apis/postGuestLogin';
import { QUERY_ACTION } from './consts/queryAction';
import { ROUTES } from './consts/route';
import { getApiErrorStatus } from './utils/apiError';
import { getRouteType } from './utils/getRouteType';
import { getLoginPath } from './utils/loginRedirect';
import { isWebview } from './utils/webBridge';

/** 봇/크롤러 UA 추정 패턴 — 대시보드 필터용 러프 추정 */
const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|uptimerobot|pingdom|headless|lighthouse|curl|wget|python-requests|axios|go-http-client/i;

/** referer 의 민감 값(query/hash)을 버리고 origin+path 만 남긴다. 파싱 실패 시 null */
const sanitizeReferer = (referer: string | null) => {
  if (!referer) return null;
  try {
    const { origin, pathname } = new URL(referer);
    return `${origin}${pathname}`;
  } catch {
    return null;
  }
};

const handleGuestLogin = async (request: NextRequest) => {
  /** 게스트 유입 분석용 로깅 — 발급 직전 요청 정보를 Sentry 로 수집 (info 라 디코 알림 대상 아님) */
  const userAgent = request.headers.get('user-agent');
  Sentry.captureMessage('guest_login', {
    level: 'info',
    fingerprint: ['guest-login'],
    tags: {
      type: 'guest_login',
      route: request.nextUrl.pathname,
      is_bot: BOT_UA_PATTERN.test(userAgent ?? ''),
    },
    extra: {
      userAgent,
      referer: sanitizeReferer(request.headers.get('referer')),
    },
  });

  const response = await postGuestLoginServer();
  const isApp = isWebview(request.headers.get('user-agent'));
  const setCookieHeaders = response.headers['set-cookie'] ?? [];

  /** app: 토큰이 응답 body(camelCase) 로, web: Set-Cookie 로 온다 */
  const { accessToken: bodyAccess, refreshToken: bodyRefresh } = response.data?.data ?? {};

  /** 발급된 토큰을 현재 요청 쿠키에 주입 */
  const cookieMap = new Map(
    request.cookies.getAll().map(cookie => [cookie.name, cookie.value] as const)
  );
  if (isApp) {
    if (bodyAccess) cookieMap.set('access_token', bodyAccess);
    if (bodyRefresh) cookieMap.set('refresh_token', bodyRefresh);
  } else {
    setCookieHeaders.forEach(setCookie => {
      const nameValue = setCookie.split(';')[0] ?? '';
      const separatorIndex = nameValue.indexOf('=');
      if (separatorIndex === -1) return;

      const name = nameValue.slice(0, separatorIndex).trim();
      const value = nameValue.slice(separatorIndex + 1).trim();
      cookieMap.set(name, value);
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    'cookie',
    [...cookieMap.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
  );

  const nextResponse = NextResponse.next({ request: { headers: requestHeaders } });

  /** 쿠키 저장 — app: body 토큰을 직접 / web: 백엔드 Set-Cookie 그대로 */
  if (isApp) {
    if (bodyAccess && bodyRefresh) {
      const cookieOptions = `Path=/; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
      const accessMaxAge = getTokenMaxAge(bodyAccess);
      const refreshMaxAge = getTokenMaxAge(bodyRefresh);
      nextResponse.headers.append(
        'set-cookie',
        `access_token=${bodyAccess}; ${cookieOptions}${accessMaxAge === null ? '' : `; Max-Age=${accessMaxAge}`}`
      );
      nextResponse.headers.append(
        'set-cookie',
        `refresh_token=${bodyRefresh}; ${cookieOptions}${refreshMaxAge === null ? '' : `; Max-Age=${refreshMaxAge}`}`
      );
    }
  } else setCookieHeaders.forEach(cookie => nextResponse.headers.append('set-cookie', cookie));

  return nextResponse;
};

/**
 * 같은 process 안에서 동일 refresh_token 으로 동시 호출되는 refresh 요청을 dedupe.
 *
 * 백엔드가 refresh_token rotation 정책(이전 토큰 즉시 무효) 을 쓰기 때문에,
 * 페이지 진입 시 RSC payload + page request 등 동시 다발 요청이 각자 refresh 를 호출하면
 * 첫 번째만 성공하고 두 번째부터 401 거부되어 사용자가 로그인 페이지로 튕긴다.
 *
 * key: refresh_token 값 그대로 사용 (다른 사용자는 다른 토큰)
 * value: 진행 중인 refresh 응답 Promise — 결과를 공유한다.
 *
 * 주의:
 *  - Edge runtime / serverless 환경에서는 process 가 짧게 살거나 인스턴스가 여러 개라
 *    완벽한 dedupe 은 불가. 그래도 대부분의 동시 요청은 동일 process 에서 발생하므로 효과적.
 *  - rotation 으로 새 토큰이 발급되면 다음 호출은 새 key 라 자동으로 새 entry 생성.
 *  - finally 에서 entry 를 제거해 메모리 누수 방지.
 */
const inflightRefreshByToken = new Map<
  string,
  Promise<Awaited<ReturnType<typeof postTokenRefreshServer>>>
>();

const refreshTokenDedupe = (refreshToken: string, cookieHeader: string) => {
  const existing = inflightRefreshByToken.get(refreshToken);
  if (existing) return existing;

  const promise = postTokenRefreshServer(cookieHeader).finally(() => {
    inflightRefreshByToken.delete(refreshToken);
  });
  inflightRefreshByToken.set(refreshToken, promise);
  return promise;
};

const handleTokenRefresh = async (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  const isApp = isWebview(request.headers.get('user-agent'));

  const cookieMap = new Map(
    request.cookies.getAll().map(cookie => [cookie.name, cookie.value] as const)
  );
  const cookieHeader = [...cookieMap.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  const refreshTokenValue = cookieMap.get('refresh_token') ?? '';

  try {
    /**
     * 토큰 갱신 요청
     * - 동일 refresh_token 에 대한 동시 호출은 한 번만 백엔드를 때리고 결과를 공유 (rotation 대응)
     */
    const response = await refreshTokenDedupe(refreshTokenValue, cookieHeader);

    /**
     * 페이지 요청에서는 쿠키 옵션을 필요로 하지 않음
     * 쿠키 옵션 제거 후 key, value만 추출하여 페이지로 전달
     */
    const setCookieHeaders = response.headers['set-cookie'] ?? [];
    const { accessToken: bodyAccess, refreshToken: bodyRefresh } = response.data?.data ?? {};

    if (isApp) {
      if (bodyAccess) cookieMap.set('access_token', bodyAccess);
      if (bodyRefresh) cookieMap.set('refresh_token', bodyRefresh);
    } else {
      setCookieHeaders.forEach(setCookie => {
        const nameValue = setCookie.split(';')[0] ?? '';
        const separatorIndex = nameValue.indexOf('=');
        if (separatorIndex === -1) return;

        const name = nameValue.slice(0, separatorIndex).trim();
        const value = nameValue.slice(separatorIndex + 1).trim();
        cookieMap.set(name, value);
      });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(
      'cookie',
      [...cookieMap.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
    );

    if (getRouteType(pathname) === 'MEMBER_ONLY')
      requestHeaders.set('x-redirect-path', `${pathname}${search}`);

    const nextResponse = NextResponse.next({ request: { headers: requestHeaders } });

    /** 쿠키 저장 — app: body 토큰을 직접 / web: 백엔드 Set-Cookie 그대로 */
    if (isApp) {
      if (bodyAccess && bodyRefresh) {
        const cookieOptions = `Path=/; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        const accessMaxAge = getTokenMaxAge(bodyAccess);
        const refreshMaxAge = getTokenMaxAge(bodyRefresh);
        nextResponse.headers.append(
          'set-cookie',
          `access_token=${bodyAccess}; ${cookieOptions}${accessMaxAge === null ? '' : `; Max-Age=${accessMaxAge}`}`
        );
        nextResponse.headers.append(
          'set-cookie',
          `refresh_token=${bodyRefresh}; ${cookieOptions}${refreshMaxAge === null ? '' : `; Max-Age=${refreshMaxAge}`}`
        );
      }
    } else setCookieHeaders.forEach(cookie => nextResponse.headers.append('set-cookie', cookie));

    return nextResponse;
  } catch (error) {
    /** 로그인 페이지 자체의 갱신 실패는 로그인으로 리다이렉트하면 자기 자신 무한 루프라 그대로 렌더 */
    const response =
      pathname === ROUTES.LOGIN
        ? NextResponse.next()
        : NextResponse.redirect(new URL(getLoginPath(`${pathname}${search}`), request.url));

    /** 죽은 토큰은 다음 진입에 사용되지 않도록 폐기 */
    if (getApiErrorStatus(error) === 401) {
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
    }

    return response;
  }
};

/** 세션 만료·탈퇴 신호로 진입한 로그인 - 토큰 폐기 후 페이지 진입 */
const handleAuthReset = (request: NextRequest) => {
  /** 페이지 렌더링 시 죽은 토큰을 보지 않도록 남은 쿠키에서 삭제 */
  const remainingCookies = request.cookies
    .getAll()
    .filter(({ name }) => name !== 'access_token' && name !== 'refresh_token')
    .map(({ name, value }) => `${name}=${value}`);

  const requestHeaders = new Headers(request.headers);
  if (remainingCookies.length) requestHeaders.set('cookie', remainingCookies.join('; '));
  else requestHeaders.delete('cookie');

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');

  return response;
};

export const proxy = async (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;

  const routeType = getRouteType(pathname);

  if (!routeType) return NextResponse.next();

  const accessToken = request.cookies.get('access_token');
  const refreshToken = request.cookies.get('refresh_token');

  /** 퍼블릭 영역 */
  if (routeType === 'PUBLIC') {
    const loginAction =
      pathname === ROUTES.LOGIN ? request.nextUrl.searchParams.get(QUERY_ACTION.KEY) : null;
    const isAuthReset =
      loginAction === QUERY_ACTION.VALUE.SESSION_EXPIRED ||
      loginAction === QUERY_ACTION.VALUE.WITHDRAWN_ACCOUNT;
    if (isAuthReset) return handleAuthReset(request);

    const needsRestore =
      pathname === ROUTES.LOGIN &&
      !(accessToken && isTokenUnexpired(accessToken.value)) &&
      isTokenUnexpired(refreshToken?.value ?? null);
    if (needsRestore) return await handleTokenRefresh(request);

    return NextResponse.next();
  }

  if (routeType === 'MEMBER_AND_GUEST') {
    /** access(O): 통과 */
    if (accessToken && isTokenUnexpired(accessToken.value)) return NextResponse.next();

    /** access(X), refresh(O): 토큰 갱신, 실패 시 로그인 페이지로 리다이렉트 */
    if (refreshToken) return await handleTokenRefresh(request);

    /** access(X), refresh(X): 초대·플레이 진입만 자동 게스트 발급 유지 (프리뷰 무토큰 전환 시 제거), 그 외는 로그인으로 */
    if (pathname.startsWith(ROUTES.TOURNAMENT_JOIN_BY_CODE) || pathname.startsWith('/play'))
      return await handleGuestLogin(request);

    return NextResponse.redirect(new URL(getLoginPath(`${pathname}${search}`), request.url));
  }

  if (routeType === 'MEMBER_ONLY' || routeType === 'AUTHORIZED') {
    /** access(O): 통과, 헤더에 쿼리파라미터까지 포함된 이동 경로 주입 */
    if (accessToken && isTokenUnexpired(accessToken.value)) {
      const headers = new Headers(request.headers);
      headers.set('x-redirect-path', `${pathname}${search}`);
      return NextResponse.next({ request: { headers } });
    }

    /** access(X), refresh(O): 토큰 갱신, 실패 시 로그인 페이지로 리다이렉트 */
    if (refreshToken) return await handleTokenRefresh(request);

    /** access(X), refresh(X): 로그인 페이지로 리다이렉트 */
    return NextResponse.redirect(new URL(getLoginPath(`${pathname}${search}`), request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
