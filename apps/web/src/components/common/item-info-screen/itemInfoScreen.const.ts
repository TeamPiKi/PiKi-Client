import { ITEM_STATUS } from '@/consts/item';
import type { ItemTypeT } from '@/types/item';

import type { ItemInfoT, ReadyItemInfoT } from './itemInfoScreen.type';

export const isReadyItemInfo = (item: ItemInfoT): item is ReadyItemInfoT =>
  item.status === ITEM_STATUS.READY &&
  item.imageUrl !== null &&
  item.name !== null &&
  item.price !== null;

export const ITEM_IMAGE_SIZES = '(max-width: 480px) calc(100vw - 40px), 440px';

type ItemInfoScreenConfigT = {
  viewTitle: string;
  deleteConfirmTitle: string;
};

/** 위시·토너먼트 아이템이 화면을 공유하되 문구가 다르다 */
export const ITEM_INFO_SCREEN_CONFIG: Record<ItemTypeT, ItemInfoScreenConfigT> = {
  wish: {
    viewTitle: '위시 정보',
    deleteConfirmTitle: '위시를 삭제할까요?',
  },
  tournament: {
    viewTitle: '위시 정보 확인',
    deleteConfirmTitle: '상품을 삭제할까요?',
  },
};
