import { ENDPOINTS } from '@/consts/api';

import { clientApi } from './client';

export const postNotificationHeartbeat = async (connectionId: string) => {
  await clientApi.post(ENDPOINTS.NOTIFICATIONS_HEARTBEAT, { connectionId });
};
