/** NOTE: 서버 전용 모듈 — 클라이언트의 role 판정은 useGetMe 로 */
import { decodeJwtPayload, isTokenUnexpired } from '@piki/core';
import { cookies } from 'next/headers';

import type { UserIdentityTypeT } from '@/types/user';

/** access token 의 role(GUEST/MEMBER) 추출 — 만료·손상 토큰은 null */
export const getRoleFromToken = (token?: string): UserIdentityTypeT | null => {
  if (!token || !isTokenUnexpired(token)) return null;

  const role = decodeJwtPayload(token)?.role;
  return role === 'GUEST' || role === 'MEMBER' ? role : null;
};

export const getIsGuest = async (): Promise<boolean> => {
  const token = (await cookies()).get('access_token')?.value;
  return getRoleFromToken(token) === 'GUEST';
};
