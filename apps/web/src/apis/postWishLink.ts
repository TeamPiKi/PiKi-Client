import { ENDPOINTS } from '@/consts/api';
import type { ApiResponseT } from '@/types/api';
import type { PostWishLinkResponseT } from '@/types/wish';

import { clientApi } from './client';

/**
 * @param url 등록할 상품 링크
 * @param isExternalShare 앱공유 유입 여부
 */
export const postWishLink = async (url: string, isExternalShare = false) => {
  const { data } = await clientApi.post<ApiResponseT<PostWishLinkResponseT>>(
    ENDPOINTS.WISHLISTS,
    { url },
    isExternalShare ? { headers: { 'X-Client-Entry-Point': 'EXTERNAL_SHARE' } } : {}
  );

  return data.data;
};
