import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { ApiResponseT } from '@/types/api';
import type { NotificationCategoryT } from '@/types/notification';

type PostNotificationsReadResponseT = ApiResponseT<{
  unreadCount: number;
  unreadCountByCategory: Record<NotificationCategoryT, number>;
}>;

type PostNotificationsReadRequestT = { all: true; ids?: never } | { ids: number[]; all?: never };

export const postNotificationsRead = async (body: PostNotificationsReadRequestT) => {
  const { data } = await clientApi.post<PostNotificationsReadResponseT>(
    ENDPOINTS.NOTIFICATIONS_READ,
    body
  );

  return data.data;
};
