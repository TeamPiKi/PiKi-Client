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
import Spinner from '@/components/spinner';
import { ANALYTICS_EVENT } from '@/consts/analytics';
import { QUERY_ACTION } from '@/consts/queryAction';
import { useNativeLoginResult } from '@/hooks/useNativeLoginResult';
import { logAnalyticsEvent } from '@/utils/analytics';
import { cn } from '@/utils/cn';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { getRouteType } from '@/utils/getRouteType';
import {
  getLoginPath,
  getPostLoginRedirectPath,
  isValidLoginRedirectPath,
  setLoginRedirectPath,
} from '@/utils/loginRedirect';
import { consumeLoginSource } from '@/utils/loginSource';
import { getRecentLoginProvider, setRecentLoginProvider } from '@/utils/recentLoginProvider';
import { refreshClientToken } from '@/utils/refreshClientToken';
import { WebBridge, isWebview } from '@/utils/webBridge';

import { getAuthUrl } from '../_apis/getAuthUrl';
import { usePostGuestLogin } from '../_hooks/usePostGuestLogin';
import RecentLoginTooltip from './RecentLoginTooltip';
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

  /** 회원 전용 경로(위시 등)로 진입 시 게스트 로그인은 의미가 없어 미노출 */
  const isMemberOnlyRedirect =
    !!validRedirect && getRouteType(validRedirect.split('?')[0] ?? validRedirect) === 'MEMBER_ONLY';

  const [isGuestRefreshing, setIsGuestRefreshing] = useState(false);
  const [nativePendingProvider, setNativePendingProvider] = useState<SocialProviderT | null>(null);
  const [webPendingProvider, setWebPendingProvider] = useState<SocialProviderT | null>(null);
  /** localStorage 는 서버에서 못 읽어 마운트 후 채운다 — 하이드레이션 불일치 방지 */
  const [recentProvider, setRecentProvider] = useState<SocialProviderT | null>(null);

  useEffect(() => setRecentProvider(getRecentLoginProvider()), []);

  const { postGuestLoginMutation, isPostGuestLoginPending } = usePostGuestLogin();
  const handleNativeLoginSettled = useCallback(() => setNativePendingProvider(null), []);
  /** 앱 성공 payload 에 provider 가 없어, 요청 시점에 눌린 버튼을 그대로 기록한다 */
  const handleNativeLoginSuccess = useCallback(() => {
    if (!nativePendingProvider) return;

    setRecentLoginProvider(nativePendingProvider);
    /** 웹은 OAuth 콜백에서 보내지만 앱은 콜백을 타지 않아 여기가 유일한 가입 완료 시점이다 */
    const source = consumeLoginSource();
    logAnalyticsEvent(ANALYTICS_EVENT.SIGN_UP_COMPLETE, {
      provider: nativePendingProvider,
      ...(source && { source }),
    });
  }, [nativePendingProvider]);
  useNativeLoginResult({
    redirect: validRedirect,
    onSettled: handleNativeLoginSettled,
    onSuccess: handleNativeLoginSuccess,
  });

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

  const isGuestPending = isPostGuestLoginPending || isGuestRefreshing;
  const activePendingProvider = nativePendingProvider ?? webPendingProvider;
  const isAnyPending = isGuestPending || activePendingProvider !== null;

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

  /**
   * 게스트 로그인
   *
   * - 기존 게스트 세션 재활용 시도
   * - 재활용 불가 시 새 게스트 발급
   */
  const handleGuestLogin = async () => {
    setLoginRedirectPath(validRedirect);

    setIsGuestRefreshing(true);
    try {
      await refreshClientToken();
      router.replace(getPostLoginRedirectPath());
      return;
    } catch {
      /** 세션 재활용 불가 */
    } finally {
      setIsGuestRefreshing(false);
    }

    postGuestLoginMutation();
  };

  /** Apple 이 숨겨진 환경(Android 웹뷰)에서는 버튼이 없어 말풍선도 띄우지 않는다 */
  const tooltipProvider = recentProvider === 'apple' && !showAppleLogin ? null : recentProvider;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative w-full">
        {tooltipProvider === 'google' && <RecentLoginTooltip />}
        <SocialLoginButton
          variant="google"
          icon={<GoogleIcon width={20} height={20} aria-hidden />}
          label="Google로 시작하기"
          isLoading={activePendingProvider === 'google'}
          disabled={isAnyPending && activePendingProvider !== 'google'}
          onClick={handleGoogleLogin}
        />
      </div>
      {showAppleLogin && (
        <div className="relative w-full">
          {tooltipProvider === 'apple' && <RecentLoginTooltip />}
          <SocialLoginButton
            variant="apple"
            icon={<AppleIcon width={20} height={20} aria-hidden />}
            label="Apple로 시작하기"
            isLoading={activePendingProvider === 'apple'}
            disabled={isAnyPending && activePendingProvider !== 'apple'}
            onClick={handleAppleLogin}
          />
        </div>
      )}
      <div className="relative w-full">
        {tooltipProvider === 'kakao' && <RecentLoginTooltip />}
        <SocialLoginButton
          variant="kakao"
          icon={<KakaoIcon width={20} height={20} aria-hidden />}
          label="카카오로 시작하기"
          isLoading={activePendingProvider === 'kakao'}
          disabled={isAnyPending && activePendingProvider !== 'kakao'}
          onClick={handleKakaoLogin}
        />
      </div>

      <button
        type="button"
        disabled={isAnyPending}
        onClick={handleGuestLogin}
        className={cn(
          'mt-7 flex cursor-pointer items-center gap-1.5 body-2-medium text-text-neutral-secondary underline underline-offset-2 disabled:opacity-50',
          isMemberOnlyRedirect && 'invisible'
        )}
      >
        {isGuestPending ? <Spinner size={16} /> : null}
        비회원으로 시작하기
      </button>
    </div>
  );
}

export default LoginButtons;
