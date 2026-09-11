import { ENDPOINTS } from '@/consts/api';
import type { ApiResponseT } from '@/types/api';
import type { PostWishLinkResponseT, WishEntryPointT } from '@/types/wish';

import { clientApi } from './client';

export const postWishLink = async (url: string, entryPoint: WishEntryPointT) => {
  const { data } = await clientApi.post<ApiResponseT<PostWishLinkResponseT>>(
    ENDPOINTS.WISHLISTS,
    { url },
    { headers: { 'X-Client-Entry-Point': entryPoint } }
  );

  return data.data;
};
