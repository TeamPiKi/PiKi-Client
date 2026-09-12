import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { QUERY_ACTION } from '@/consts/queryAction';
import type { UserIdentityTypeT } from '@/types/user';
import { getRoleFromToken } from '@/utils/auth';
import { getLoginPath } from '@/utils/loginRedirect';

/** RSC 레이아웃 게이트용 role 판별 — 토큰이 무효하면 세션 만료로 로그인 페이지에 redirect */
export const getRoleOrRedirect = async (): Promise<UserIdentityTypeT> => {
  const redirectPath = (await headers()).get('x-redirect-path');

  const accessToken = (await cookies()).get('access_token')?.value;
  const role = getRoleFromToken(accessToken);

  if (role === null) redirect(getLoginPath(redirectPath, QUERY_ACTION.VALUE.SESSION_EXPIRED));

  return role;
};
