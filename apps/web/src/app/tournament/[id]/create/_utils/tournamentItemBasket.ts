import { BASKET_COUNT, ITEMS_PER_BASKET } from '../_consts/tournamentItemBasket';

/** 아이템 개수에 따른 활성 장바구니 수 (최대 BASKET_COUNT) */
export const getActiveBasketCount = (itemCount: number) => {
  if (itemCount === 0) return 1;

  const filledBaskets = Math.ceil(itemCount / ITEMS_PER_BASKET);
  const isLastBasketFull = itemCount % ITEMS_PER_BASKET === 0;

  if (isLastBasketFull) return Math.min(BASKET_COUNT, filledBaskets + 1);

  return Math.min(BASKET_COUNT, filledBaskets);
};

export const getBasketIndexForItem = (itemIndex: number) => {
  if (itemIndex <= 0) return 0;

  return Math.min(BASKET_COUNT - 1, Math.floor(itemIndex / ITEMS_PER_BASKET));
};
