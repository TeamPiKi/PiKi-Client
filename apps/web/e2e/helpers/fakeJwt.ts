const toBase64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * 미들웨어(src/proxy.ts)의 isTokenUnexpired는 서명 검증 없이 payload.exp만 확인한다.
 * exp가 미래인 JWT 형태 문자열이면 미들웨어를 통과하고,
 * 서버사이드 게스트 로그인(postGuestLoginServer)이 발생하지 않는다 — 네트워크 0회.
 */
export const createFakeJwt = (expiresInSeconds = 60 * 60, role: 'GUEST' | 'MEMBER' = 'MEMBER') =>
  [
    toBase64Url({ alg: 'HS256', typ: 'JWT' }),
    toBase64Url({
      sub: 'e2e-user',
      /** role 클레임 기반 gating(getRoleFromToken)용 — 기본 MEMBER 는 SSR 목의 MOCK_MEMBER_ME(회원 고정)와 정합 */
      role,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
    'e2e-fake-signature',
  ].join('.');
