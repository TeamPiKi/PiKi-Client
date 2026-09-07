import { getTokenExpiresIso, isFresherToken, isTokenUnexpired } from '@piki/core';
import CookieManager from '@react-native-cookies/cookies';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { postTokenRefresh } from '@/apis/postTokenRefresh';
import { captureError } from '@/utils/captureError';
import { TokenStorage } from '@/utils/tokenStorage';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
/** 마운트 기준 부팅 상한 — 워밍업 로드(<1s) + 토큰 갱신 타임아웃(5s) 을 감안한 값 */
const BOOT_SYNC_TIMEOUT_MS = 10_000;

/**
 * SecureStore ↔ WebView 쿠키 저장소 양방향 동기화
 *
 * @param isWebviewReady 웹뷰 로드 완료 여부
 *
 * - 부팅 시(isWebviewReady): SecureStore → 웹뷰 쿠키 (웹뷰 첫 요청 전에 심어야 RSC 프리페치 정상 동작)
 * - 포그라운드 복귀, 백그라운드 진입 시: 웹뷰 쿠키 → SecureStore (웹/proxy 가 갱신한 토큰 회수)
 */
export const useWebviewCookieSync = (isWebviewReady: boolean) => {
  const [isSynced, setIsSynced] = useState(false);
  /** 부팅 동기화 진행 단계 — 타임아웃 시 어느 await 에서 멈췄는지 Sentry 태그로 보고 */
  const stepRef = useRef('warmup');
  const isSettledRef = useRef(false);
  /** 타임아웃 뒤 늦게 재개된 sync 가 사용자의 새 로그인 세션을 덮어쓰지 않도록 변경 작업을 차단 */
  const isAbortedRef = useRef(false);

  const settle = useCallback(() => {
    isSettledRef.current = true;
    setIsSynced(true);
  }, []);

  /** 부팅 watchdog — 워밍업 로드가 끝나지 않거나 sync 의 네이티브 호출이 매달려도 상한 뒤 부팅을 진행 */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isSettledRef.current) return;

      captureError(new Error('[COOKIE_SYNC] 부팅 동기화 타임아웃'), {
        tags: { source: 'cookie-sync', step: stepRef.current },
        extra: { timeoutMs: BOOT_SYNC_TIMEOUT_MS },
      });
      isAbortedRef.current = true;
      settle();
    }, BOOT_SYNC_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [settle]);

  /** SecureStore → 웹뷰 쿠키 동기화 */
  useEffect(() => {
    /**
     * NOTE: iOS 웹뷰 쿠키 저장소(WKHTTPCookieStore)는 WKWebView 인스턴스가 최소 하나 살아있어야 제대로 동작함.
     * 인스턴스 없이 싱크를 시도하면 토큰 유실되므로, 웹뷰 로드 완료 후(isWebviewReady)에만 동기화 시도
     */
    if (!isWebviewReady) return;

    const useWebKit = Platform.OS === 'ios';

    const sync = async () => {
      stepRef.current = 'read-store';
      let accessToken = await TokenStorage.getAccessToken();
      let refreshToken = await TokenStorage.getRefreshToken();

      /** SecureStore vs 웹뷰 쿠키 중 최신 토큰 채택 */
      stepRef.current = 'read-cookie';
      const cookies = await CookieManager.get(WEB_URL, useWebKit);
      const cookieAccessToken = cookies['access_token']?.value ?? null;
      const cookieRefreshToken = cookies['refresh_token']?.value ?? null;
      if (isAbortedRef.current) return;

      if (
        cookieAccessToken &&
        cookieRefreshToken &&
        isFresherToken(cookieRefreshToken, refreshToken)
      ) {
        accessToken = cookieAccessToken;
        refreshToken = cookieRefreshToken;
        stepRef.current = 'save-cookie-token';
        await TokenStorage.setTokens(accessToken, refreshToken);
      }

      /** access 가 아직 유효하면 refresh 생략 */
      if (refreshToken && !isTokenUnexpired(accessToken, 60_000)) {
        try {
          stepRef.current = 'refresh';
          const refreshResponse = await postTokenRefresh(refreshToken);
          if (isAbortedRef.current) return;

          if (refreshResponse.ok) {
            stepRef.current = 'parse-refresh';
            const refreshBody = (await refreshResponse.json()) as {
              data: { accessToken: string; refreshToken: string };
            };
            if (isAbortedRef.current) return;
            accessToken = refreshBody.data.accessToken;
            refreshToken = refreshBody.data.refreshToken;
            await TokenStorage.setTokens(accessToken, refreshToken);
          } else if (refreshResponse.status === 401) {
            /** 토큰 갱신 401 응답 시 만료된 토큰 정리 */
            stepRef.current = 'clear-expired';
            await TokenStorage.clearTokens();
            await CookieManager.clearAll(useWebKit);
            if (useWebKit) await CookieManager.clearAll(false);
            accessToken = null;
            refreshToken = null;
          }
        } catch {
          /** 네트워크 등 일시적 실패 → 기존 토큰 유지 */
        }
      }

      const setAuthCookie = async (name: string, value: string) => {
        /** expires 미지정 시 세션 쿠키가 되어 앱 종료 때 증발 — 토큰 exp 를 그대로 부여 */
        const expires = getTokenExpiresIso(value);
        const cookie = { name, value, path: '/', ...(expires ? { expires } : {}) };

        await CookieManager.set(WEB_URL, cookie, useWebKit);
        if (useWebKit) await CookieManager.set(WEB_URL, cookie, false);
      };

      /** 앱 진입 시 유효한 최신 토큰을 웹뷰 쿠키에 주입 */
      if (isAbortedRef.current) return;
      stepRef.current = 'set-cookie';
      if (accessToken) await setAuthCookie('access_token', accessToken);
      if (refreshToken) await setAuthCookie('refresh_token', refreshToken);
    };

    sync()
      .catch(error => {
        if (__DEV__) console.warn('[COOKIE_SYNC] 동기화 실패:', String(error));
      })
      /** 싱크 실패하더라도 스플래시가 무한으로 뜨는 현상을 방지 */
      .finally(settle);
  }, [isWebviewReady, settle]);

  /**
   * 웹뷰 쿠키 → SecureStore 동기화
   *
   * - 포그라운드 복귀·백그라운드 진입 시
   * - 단, proxy에서 토큰 갱신 시 WebBridge 호출 불가 → AppState로 커버
   */
  useEffect(() => {
    const useWebKit = Platform.OS === 'ios';

    const syncCookiesToStore = async () => {
      const cookies = await CookieManager.get(WEB_URL, useWebKit);
      const accessToken = cookies['access_token']?.value;
      const refreshToken = cookies['refresh_token']?.value;
      if (accessToken && refreshToken) {
        await TokenStorage.setTokens(accessToken, refreshToken);
      }
    };

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active' && nextState !== 'background') return;
      syncCookiesToStore();
    });

    return () => subscription.remove();
  }, []);

  return { isSynced };
};
