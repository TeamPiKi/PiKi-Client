import type { SocialProviderT } from '@piki/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';

import { ANALYTICS_EVENT } from '@/consts/analytics';
import { QUERY_ACTION } from '@/consts/queryAction';
import { QUERY_KEYS } from '@/consts/queryKeys';
import type { ApiErrorResponseT } from '@/types/api';
import { logAnalyticsEvent } from '@/utils/analytics';
import { isServerOrNetworkError, isWithdrawnAccountError } from '@/utils/apiError';
import { getLoginPath, getLoginRedirectPath } from '@/utils/loginRedirect';
import { setRecentLoginProvider } from '@/utils/recentLoginProvider';

import { postSocialLogin } from '../_apis/postSocialLogin';

export const usePostSocialLogin = (provider: SocialProviderT) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate: postSocialLoginMutation, isPending: isPostSocialLoginPending } = useMutation({
    mutationFn: ({
      code,
      redirect: _redirect,
      redirectUri,
      state,
    }: {
      code: string;
      redirect: string | null;
      redirectUri: string;
      state: string;
    }) => postSocialLogin(provider, { code, redirectUri, state }),
    onSuccess: (_, variables) => {
      logAnalyticsEvent(ANALYTICS_EVENT.SIGN_UP_COMPLETE, { provider });
      setRecentLoginProvider(provider);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.ME });
      window.location.replace(getLoginRedirectPath(variables.redirect));
    },
    onError: (error, variables) => {
      /** 탈퇴 계정(409 USER-003)은 client.ts 인터셉터가 세션 정리 + WITHDRAWN_ACCOUNT 이동까지 끝낸다 */
      if (isWithdrawnAccountError(error)) return;

      /** 5xx·네트워크 문구는 전역 안전망이 띄운다 → 액션 쿼리 없이 이동해 토스트 중복을 막는다 */
      if (isServerOrNetworkError(error)) {
        router.replace(getLoginPath(variables.redirect));
        return;
      }

      /**
       * 4xx 는 code 를 함께 넘겨 로그인 페이지가 카탈로그 문구를 띄우게 한다 (OAUTH-* 구분 유지).
       * 401 도 여기서 처리 — 로그인 실패이지 세션 만료가 아니고, client.ts 인터셉터도 callback 경로는 리다이렉트에서 제외한다.
       */
      const code = isAxiosError<ApiErrorResponseT>(error) ? error.response?.data?.code : null;
      router.replace(getLoginPath(variables.redirect, QUERY_ACTION.VALUE.SOCIAL_LOGIN_ERROR, code));
    },
  });

  return { postSocialLoginMutation, isPostSocialLoginPending };
};
