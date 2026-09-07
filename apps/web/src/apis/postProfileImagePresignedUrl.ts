import { ENDPOINTS } from '@/consts/api';
import type { ApiResponseT } from '@/types/api';
import type { PresignedImageUploadT } from '@/types/image';
import type { PostProfileImagePresignedUrlRequestT } from '@/types/user';

import { clientApi } from './client';

/**
 * 프로필 이미지 업로드용 presigned URL 발급 (MEMBER 전용)
 *
 * 위시/토너먼트와 달리 `uploads` 배열이 아닌 단건 flat 응답이다.
 */
export const postProfileImagePresignedUrl = async (body: PostProfileImagePresignedUrlRequestT) => {
  const { data } = await clientApi.post<ApiResponseT<PresignedImageUploadT>>(
    ENDPOINTS.USER_PROFILE_IMAGE_PRESIGNED,
    body
  );

  return data.data;
};
