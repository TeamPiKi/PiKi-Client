import type { SocialProviderT } from '@piki/core';

import { RECENT_LOGIN_PROVIDER_KEY } from '@/consts/recentLoginProvider';

/** 저장값 검증용 화이트리스트 — 손상된 값이 말풍선 대상으로 새지 않도록 읽을 때 대조한다 */
const SOCIAL_PROVIDERS: readonly SocialProviderT[] = ['google', 'apple', 'kakao'];

const isSocialProvider = (value: string | null): value is SocialProviderT =>
  SOCIAL_PROVIDERS.includes(value as SocialProviderT);

/**
 * 최근 로그인 수단 조회.
 *
 * 만료를 두지 않는다 — 수혜자가 "오래 안 와서 토큰이 만료된 유저"라 TTL 이 있으면 정작 그 유저에게서 힌트가 사라진다.
 * localStorage 접근 실패(private mode·webview 설정 등)는 힌트 없음으로 처리해 로그인 화면 렌더를 막지 않는다.
 */
export const getRecentLoginProvider = (): SocialProviderT | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedProvider = window.localStorage.getItem(RECENT_LOGIN_PROVIDER_KEY);
    return isSocialProvider(storedProvider) ? storedProvider : null;
  } catch {
    return null;
  }
};

/** 최근 로그인 수단 기록 — 매 소셜 로그인 성공 시 덮어써 마지막 수단 하나만 유지한다 */
export const setRecentLoginProvider = (provider: SocialProviderT) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(RECENT_LOGIN_PROVIDER_KEY, provider);
  } catch {
    /** private mode 등 — 힌트는 부가 기능이라 무시 */
  }
};

/** 최근 로그인 수단 삭제 — 탈퇴 전용. 로그아웃은 재로그인을 돕기 위해 유지한다 */
export const clearRecentLoginProvider = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(RECENT_LOGIN_PROVIDER_KEY);
  } catch {
    /** private mode 등 — 무시 */
  }
};
