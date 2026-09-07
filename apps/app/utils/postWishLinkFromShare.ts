import { postTokenRefresh } from '@/apis/postTokenRefresh';

import { TokenStorage } from './tokenStorage';

/**
 * 실패 사유. 문구는 시트가 정하고 여기서는 사유만 식별한다.
 * - `unauthenticated` 토큰 없음 → 로그인 유도
 * - `sessionExpired` refresh 실패 → 로그인 유도
 * - `network` 네트워크 예외 → 재시도 가능
 * - `server` 서버 오류 → 재시도 가능
 */
export type ShareFailureReasonT = 'unauthenticated' | 'sessionExpired' | 'network' | 'server';

const SHARE_ITEM_STATUSES = ['PENDING', 'PROCESSING', 'READY', 'INCOMPLETE', 'FAILED'] as const;

export type ShareItemStatusT = (typeof SHARE_ITEM_STATUSES)[number];

/** 응답 body 의 status 는 런타임 검증이 없어 모르는 값이 그대로 흘러들 수 있다 */
export const isShareItemStatus = (value: unknown): value is ShareItemStatusT =>
  SHARE_ITEM_STATUSES.includes(value as ShareItemStatusT);

export type ShareWishT = {
  id: number;
};

export type ShareItemT = {
  id: number;
  status: ShareItemStatusT;
  name: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
};

export type PostWishLinkFromShareResultT =
  | {
      ok: true;
      /** 응답 body 를 못 읽으면 null — 저장은 성공이므로 시트는 기존 성공 화면으로 폴백 */
      wish: ShareWishT | null;
      item: ShareItemT | null;
      /** refresh 까지 끝난 시점의 토큰 — SSE 구독·위시 재조회에 재사용 */
      accessToken: string;
    }
  | {
      ok: false;
      reason: ShareFailureReasonT;
      /**
       * 다시 시도할 가치가 있는지. 같은 reason 이라도 갈린다 —
       * 서버 5xx 는 재시도 가능하지만 설정 누락은 몇 번을 눌러도 같다.
       */
      retryable: boolean;
      /** 서버가 내려준 에러 코드 (로컬 판단 실패면 없음) */
      code?: string;
    };

const postWishLink = async (productUrl: string, accessToken: string) =>
  fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/wishlists`, {
    method: 'POST',
    headers: {
      'X-Client-Type': 'app',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url: productUrl }),
  });

/** 실패 응답 body 의 code 만 뽑는다. 파싱 실패는 무시 — 사유는 status 로 이미 갈렸다. */
const readErrorCode = async (response: Response): Promise<string | null> => {
  try {
    const body = (await response.json()) as { code?: string | null };
    return body.code ?? null;
  } catch {
    return null;
  }
};

/**
 * 성공 응답에서 wish·item 을 뽑는다. 모양이 어긋나면 null —
 * 저장 자체는 성공이므로 호출부는 파싱 안내 없이 기존 성공 화면으로 폴백한다.
 */
const readSuccessBody = async (
  response: Response
): Promise<{ wish: ShareWishT; item: ShareItemT } | null> => {
  try {
    const body = (await response.json()) as {
      data?: { wish?: ShareWishT | null; item?: ShareItemT | null } | null;
    };
    const wish = body.data?.wish;
    const item = body.data?.item;

    if (typeof wish?.id !== 'number' || typeof item?.id !== 'number') return null;
    /** 모르는 status 는 종결 여부를 판단할 수 없다 — SSE 로 넘기지 않고 성공 폴백 */
    if (!isShareItemStatus(item.status)) return null;

    return { wish, item };
  } catch {
    return null;
  }
};

/** Share Extension에서 링크로 위시 등록 */
export const postWishLinkFromShare = async (
  productUrl: string
): Promise<PostWishLinkFromShareResultT> => {
  /** 빌드 설정 누락 — 다시 눌러도 결과가 같다 */
  if (!process.env.EXPO_PUBLIC_API_URL) return { ok: false, reason: 'server', retryable: false };

  const accessToken = await TokenStorage.getAccessToken();
  const refreshToken = await TokenStorage.getRefreshToken();

  if (!accessToken) return { ok: false, reason: 'unauthenticated', retryable: false };

  try {
    /** 위시 등록 시도 */
    let activeToken = accessToken;
    let postWishResponse = await postWishLink(productUrl, activeToken);

    if (postWishResponse.status === 401 && refreshToken) {
      /** 토큰 만료 시 토큰 갱신 */
      const refreshResponse = await postTokenRefresh(refreshToken);

      if (!refreshResponse.ok) {
        /** 죽은 토큰으로 재시도가 반복되지 않도록 정리 */
        if (refreshResponse.status === 401) await TokenStorage.clearTokens();
        return { ok: false, reason: 'sessionExpired', retryable: false };
      }

      /** 토큰 갱신 후 토큰 저장 */
      const refreshBody = (await refreshResponse.json()) as {
        data: { accessToken: string; refreshToken: string };
      };
      await TokenStorage.setTokens(refreshBody.data.accessToken, refreshBody.data.refreshToken);

      /** 위시 등록 재시도 */
      activeToken = refreshBody.data.accessToken;
      postWishResponse = await postWishLink(productUrl, activeToken);
    }

    if (!postWishResponse.ok) {
      const code = await readErrorCode(postWishResponse);
      /** refreshToken 이 없어 갱신조차 못 한 401 도 세션 만료로 본다 */
      const reason: ShareFailureReasonT =
        postWishResponse.status === 401 ? 'sessionExpired' : 'server';

      return { ok: false, reason, retryable: reason === 'server', ...(code ? { code } : {}) };
    }

    const successBody = await readSuccessBody(postWishResponse);

    return {
      ok: true,
      wish: successBody?.wish ?? null,
      item: successBody?.item ?? null,
      accessToken: activeToken,
    };
  } catch {
    return { ok: false, reason: 'network', retryable: true };
  }
};
