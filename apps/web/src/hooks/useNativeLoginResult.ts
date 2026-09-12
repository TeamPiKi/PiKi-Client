import { DEFAULT_ERROR_MESSAGE, ERROR_MESSAGE_MAP, WEBBRIDGE_MESSAGE_TYPE } from '@piki/core';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { useWebBridgeMessage } from '@/hooks/useWebBridgeMessage';
import { setCookie } from '@/utils/cookie';
import { getLoginPath, getLoginRedirectPath } from '@/utils/loginRedirect';
import { WebBridge } from '@/utils/webBridge';

const CATALOG_MESSAGES = new Set<string>(Object.values(ERROR_MESSAGE_MAP));

type UseNativeLoginResultOptionsT = {
  redirect?: string | null;
  onSettled?: () => void;
  /** 로그인 성공 시에만 호출 — 앱 payload 에 provider 가 없어 요청 측이 아는 값으로 기록한다 */
  onSuccess?: () => void;
};

export const useNativeLoginResult = ({
  redirect = null,
  onSettled,
  onSuccess,
}: UseNativeLoginResultOptionsT = {}) => {
  const router = useRouter();

  useWebBridgeMessage(
    useCallback(
      message => {
        if (message.type === WEBBRIDGE_MESSAGE_TYPE.APP_RES_SOCIAL_LOGIN_SUCCESS) {
          const { accessToken, refreshToken } = message.payload;
          setCookie('access_token', accessToken, { minutes: 15 });
          setCookie('refresh_token', refreshToken, { days: 14 });
          onSuccess?.();
          onSettled?.();
          /** 쿠키 세팅 후 FCM 토큰 재등록 — 로그인 전 첫 시도는 인증 없어서 실패하기 때문 */
          WebBridge.postMessage({ type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_PUSH_PERMISSION_STATUS });
          router.replace(getLoginRedirectPath(redirect));
        } else if (message.type === WEBBRIDGE_MESSAGE_TYPE.APP_RES_SOCIAL_LOGIN_ERROR) {
          onSettled?.();
          /** 앱 payload 는 런타임 검증이 없다 — 카탈로그 문구일 때만 노출하고 SDK 예외 원문은 버린다 */
          const detail = message.payload?.detail;
          toast.error(
            typeof detail === 'string' && CATALOG_MESSAGES.has(detail)
              ? detail
              : DEFAULT_ERROR_MESSAGE
          );
          router.replace(getLoginPath(redirect));
        } else if (message.type === WEBBRIDGE_MESSAGE_TYPE.APP_RES_SOCIAL_LOGIN_CANCEL) {
          onSettled?.();
        }
      },
      [onSettled, onSuccess, redirect, router]
    )
  );
};
