import { ENDPOINTS } from '@/consts/api';
import type { ApiResponseT } from '@/types/api';
import type { PatchMeRequestT, UserT } from '@/types/user';

import { clientApi } from './client';

export const patchMe = async (body: PatchMeRequestT) => {
  const { data } = await clientApi.patch<ApiResponseT<UserT>>(ENDPOINTS.USER, body);

  return data.data;
};
