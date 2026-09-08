import { describe, expect, it } from 'vitest';

import { BASKET_COUNT, ITEMS_PER_BASKET } from '../_consts/tournamentItemBasket';
import { getActiveBasketCount, getBasketIndexForItem } from './tournamentItemBasket';

const MAX_ITEM_COUNT = ITEMS_PER_BASKET * BASKET_COUNT;

describe('getActiveBasketCount', () => {
  it('아이템이 없으면 빈 바구니 1개를 보여준다', () => {
    expect(getActiveBasketCount(0)).toBe(1);
  });

  it('바구니가 채워지는 중이면 채워진 바구니까지만 보여준다', () => {
    expect(getActiveBasketCount(1)).toBe(1);
    expect(getActiveBasketCount(ITEMS_PER_BASKET - 1)).toBe(1);
    expect(getActiveBasketCount(ITEMS_PER_BASKET + 1)).toBe(2);
  });

  it('바구니가 꽉 차면 다음 빈 바구니를 미리 열어준다', () => {
    expect(getActiveBasketCount(ITEMS_PER_BASKET)).toBe(2);
    expect(getActiveBasketCount(ITEMS_PER_BASKET * 2)).toBe(3);
  });

  it('마지막 바구니가 꽉 차도 BASKET_COUNT 를 넘기지 않는다', () => {
    expect(getActiveBasketCount(MAX_ITEM_COUNT - 1)).toBe(BASKET_COUNT);
    expect(getActiveBasketCount(MAX_ITEM_COUNT)).toBe(BASKET_COUNT);
  });
});

describe('getBasketIndexForItem', () => {
  it('첫 아이템은 첫 번째 바구니를 가리킨다', () => {
    expect(getBasketIndexForItem(0)).toBe(0);
  });

  it('바구니 경계에서 다음 바구니로 넘어간다', () => {
    expect(getBasketIndexForItem(ITEMS_PER_BASKET - 1)).toBe(0);
    expect(getBasketIndexForItem(ITEMS_PER_BASKET)).toBe(1);
  });

  it('마지막 아이템은 마지막 바구니에 들어간다', () => {
    expect(getBasketIndexForItem(MAX_ITEM_COUNT - 1)).toBe(BASKET_COUNT - 1);
  });

  it('마지막 바구니 인덱스를 넘기지 않는다', () => {
    expect(getBasketIndexForItem(MAX_ITEM_COUNT)).toBe(BASKET_COUNT - 1);
  });
});
