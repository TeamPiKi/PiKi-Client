import { type ShareItemT, isShareItemStatus } from './postWishLinkFromShare';

/** 카드 데이터 조달용 재조회 — 성공 화면 폴백이 있으니 오래 붙잡지 않는다 */
const FETCH_TIMEOUT_MS = 5_000;

/**
 * READY 알림 수신 후 상품 카드 데이터(이름·가격·이미지)를 채우기 위한 위시 상세 재조회.
 * 실패는 throw 하지 않고 null — 호출부는 기존 성공 화면으로 조용히 폴백한다.
 */
export const getWishFromShare = async (
  wishId: number,
  accessToken: string
): Promise<ShareItemT | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/wishlists/${wishId}`, {
      headers: {
        'X-Client-Type': 'app',
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { data?: { item?: ShareItemT | null } | null };
    const item = body.data?.item;

    return typeof item?.id === 'number' && isShareItemStatus(item.status) ? item : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
