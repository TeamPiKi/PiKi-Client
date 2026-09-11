'use client';

import type { SocialProviderT } from '@piki/core';
import {
  DEFAULT_ERROR_MESSAGE,
  ERROR_CODE,
  ERROR_MESSAGE_MAP,
  WEBBRIDGE_MESSAGE_TYPE,
  getErrorMessageByCode,
} from '@piki/core';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import AppleIcon from '@/assets/icons/social/apple.svg';
import GoogleIcon from '@/assets/icons/social/google.svg';
import KakaoIcon from '@/assets/icons/social/kakao.svg';
import { QUERY_ACTION } from '@/consts/queryAction';
import { useNativeLoginResult } from '@/hooks/useNativeLoginResult';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import {
  getLoginPath,
  isValidLoginRedirectPath,
  setLoginRedirectPath,
} from '@/utils/loginRedirect';
import { WebBridge, isWebview } from '@/utils/webBridge';

import { getAuthUrl } from '../_apis/getAuthUrl';
import SocialLoginButton from './SocialLoginButton';

type LoginButtonsProps = {
  redirect: string | null;
  action: string | null;
  /** 리다이렉트로 전달받은 서버 에러 코드 — 카탈로그 문구 노출용 */
  errorCode: string | null;
  /** Android 웹뷰에서는 false — 네이티브 Apple 로그인이 iOS 전용이라 미노출 */
  showAppleLogin: boolean;
};

function LoginButtons({ redirect, action, errorCode, showAppleLogin }: LoginButtonsProps) {
  const router = useRouter();
  const validRedirect = isValidLoginRedirectPath(redirect) ? redirect : null;

  const [nativePendingProvider, setNativePendingProvider] = useState<SocialProviderT | null>(null);
  const [webPendingProvider, setWebPendingProvider] = useState<SocialProviderT | null>(null);

  const handleNativeLoginSettled = useCallback(() => setNativePendingProvider(null), []);
  useNativeLoginResult({ redirect: validRedirect, onSettled: handleNativeLoginSettled });

  useEffect(() => {
    const handleLoginError = () => {
      if (action === QUERY_ACTION.VALUE.SESSION_EXPIRED) {
        if (isWebview()) WebBridge.postMessage({ type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_LOGOUT });
        toast.error(ERROR_MESSAGE_MAP[ERROR_CODE.AUTH_INVALID_TOKEN]);
        router.replace(getLoginPath(validRedirect), { scroll: false });
        return;
      }
      if (action === QUERY_ACTION.VALUE.WITHDRAWN_ACCOUNT) {
        if (isWebview()) WebBridge.postMessage({ type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_LOGOUT });
        toast.error(ERROR_MESSAGE_MAP[ERROR_CODE.USER_DELETED]);
        router.replace(getLoginPath(validRedirect), { scroll: false });
        return;
      }
      if (action === QUERY_ACTION.VALUE.SOCIAL_LOGIN_ERROR) {
        toast.error(getErrorMessageByCode(errorCode) ?? DEFAULT_ERROR_MESSAGE);
        router.replace(getLoginPath(validRedirect), { scroll: false });
      }
    };

    /** NOTE: dev 모드에서는 strict mode 로 인해 두 번 실행되는 문제를 방지하기 위해 setTimeout 을 사용 */
    if (process.env.NODE_ENV === 'development') {
      const timer = window.setTimeout(handleLoginError, 0);
      return () => window.clearTimeout(timer);
    }

    handleLoginError();
  }, [action, errorCode, validRedirect, router]);

  const activePendingProvider = nativePendingProvider ?? webPendingProvider;
  const isAnyPending = activePendingProvider !== null;

  const postNativeMessage = (provider: SocialProviderT) => {
    if (!isWebview()) return false;

    setNativePendingProvider(provider);
    WebBridge.postMessage({
      type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_SOCIAL_LOGIN,
      payload: { provider },
    });
    return true;
  };

  const handleSocialLogin = async (provider: SocialProviderT) => {
    if (postNativeMessage(provider)) return;

    setLoginRedirectPath(validRedirect);
    setWebPendingProvider(provider);
    try {
      const { url } = await getAuthUrl(provider, validRedirect);
      window.location.href = url;
    } catch (error) {
      /** react-query 밖 호출 — 전역 안전망이 잡지 않아 직접 안내 */
      toast.error(getApiErrorMessage(error));
      setWebPendingProvider(null);
    }
  };

  const handleKakaoLogin = () => handleSocialLogin('kakao');
  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleAppleLogin = () => handleSocialLogin('apple');

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <SocialLoginButton
        variant="google"
        icon={<GoogleIcon width={20} height={20} aria-hidden />}
        label="Google로 시작하기"
        isLoading={activePendingProvider === 'google'}
        disabled={isAnyPending && activePendingProvider !== 'google'}
        onClick={handleGoogleLogin}
      />
      {showAppleLogin && (
        <SocialLoginButton
          variant="apple"
          icon={<AppleIcon width={20} height={20} aria-hidden />}
          label="Apple로 시작하기"
          isLoading={activePendingProvider === 'apple'}
          disabled={isAnyPending && activePendingProvider !== 'apple'}
          onClick={handleAppleLogin}
        />
      )}
      <SocialLoginButton
        variant="kakao"
        icon={<KakaoIcon width={20} height={20} aria-hidden />}
        label="카카오로 시작하기"
        isLoading={activePendingProvider === 'kakao'}
        disabled={isAnyPending && activePendingProvider !== 'kakao'}
        onClick={handleKakaoLogin}
      />
    </div>
  );
}

export default LoginButtons;
