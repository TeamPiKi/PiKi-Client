import type { ITEM_STATUS } from '@/consts/item';

export type NotificationTypeT =
  | 'TOURNAMENT_JOINED'
  | 'TOURNAMENT_ITEM_ADDED'
  | 'TOURNAMENT_ITEM_DELETED'
  | 'TOURNAMENT_STARTED'
  | 'TOURNAMENT_PLAYED_FROM_LINK'
  | 'TOURNAMENT_COMPLETED'
  | 'TOURNAMENT_RESULT_READY'
  | 'ITEM_PARSING_COMPLETED'
  | 'ITEM_PARSING_INCOMPLETE'
  | 'ITEM_PARSING_FAILED'
  | 'ITEM_REFRESH_COMPLETED'
  | 'ANNOUNCEMENT';

export type NotificationKindT = 'WISH' | 'TOURNAMENT' | 'SYSTEM';

export type NotificationCategoryT = 'ACTIVITY' | 'SYSTEM';

export type NotificationItemT = {
  id: number;
  type: NotificationTypeT;
  category: NotificationCategoryT;
  title: string;
  body: string;
  imageUrl: string;
  refId: number;
  isRead: boolean;
  createdAt: string;
  kind: NotificationKindT;
  wishId?: number;
  tournamentId?: number;
  tournamentItemId?: number;
};

export type NotificationListDataT = {
  items: NotificationItemT[];
  unreadCount: number;
  unreadCountByCategory: Record<NotificationCategoryT, number>;
};

export type SilentSyncSsePayloadT =
  | {
      type: 'TOURNAMENT_ITEM_PARSED';
      tournamentId: number;
      tournamentItemId: number;
      status:
        | (typeof ITEM_STATUS)['READY']
        | (typeof ITEM_STATUS)['INCOMPLETE']
        | (typeof ITEM_STATUS)['FAILED'];
    }
  | {
      type: 'UNREAD_COUNT_CHANGED';
      unreadCount: number;
    };

export type NotificationSsePayloadT = {
  id: number;
  type: NotificationTypeT;
  category: string;
  title: string;
  body: string;
  imageUrl: string;
  refId: number;
  isRead: boolean;
  createdAt: string;
  kind: NotificationKindT;
  wishId?: number;
  tournamentId?: number;
  tournamentItemId?: number;
};
