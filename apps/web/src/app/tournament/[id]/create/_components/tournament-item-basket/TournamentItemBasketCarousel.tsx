'use client';

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from '@/components/carousel';
import useContainerHeight from '@/hooks/useContainerHeight';
import { cn } from '@/utils/cn';

import type { PendingTournamentItemT } from '../../../_common/_types/tournamentResponse';
import {
  BASKET_CAROUSEL_SLIDE_SIZE_PERCENT,
  BASKET_STACK_GAP,
  ITEMS_PER_BASKET,
} from '../../_consts/tournamentItemBasket';
import { getActiveBasketCount, getBasketIndexForItem } from '../../_utils/tournamentItemBasket';
import TournamentItemBasket from './TournamentItemBasket';

type TournamentItemBasketCarouselProps = {
  items?: PendingTournamentItemT[];
  scrollToLast?: boolean;
  /** 위시 담기 등 재진입 시점의 기존 아이템 개수 */
  previousItemCount?: number | null;
  highlightItemId?: number | null;
  isAddItemBlocked?: boolean;
  participantImageMap?: Map<string, string>;
  bottomSlot?: React.ReactNode;
};

function TournamentItemBasketCarousel({
  items = [],
  scrollToLast = false,
  previousItemCount = null,
  highlightItemId = null,
  isAddItemBlocked = false,
  participantImageMap,
  bottomSlot,
}: TournamentItemBasketCarouselProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const activeBasketCount = useMemo(() => getActiveBasketCount(items.length), [items.length]);

  /** 재진입 시 이미 생성된 바구니는 제외하고 증가 여부를 판단하기 위해 이전 개수를 기준으로 비교 */
  const prevBasketCountRef = useRef(
    previousItemCount === null ? activeBasketCount : getActiveBasketCount(previousItemCount)
  );
  useEffect(() => {
    if (activeBasketCount > prevBasketCountRef.current) {
      toast.info('카트가 꽉 찼어요! 새 카트를 만들었어요.');
    }
    prevBasketCountRef.current = activeBasketCount;
  }, [activeBasketCount]);

  const prevItemCountRef = useRef(scrollToLast ? 0 : items.length);

  const isCarouselEnabled = activeBasketCount > 1;

  /** 담기 완료 시 마지막 아이템이 있는 바구니로 이동 (링크 담기: 실시간 / 위시 담기: 페이지 재진입) */
  useEffect(() => {
    if (!isCarouselEnabled) {
      prevItemCountRef.current = items.length;
      return;
    }

    if (!carouselApi) return;

    if (items.length > prevItemCountRef.current) {
      carouselApi.scrollTo(getBasketIndexForItem(items.length - 1));
    }

    prevItemCountRef.current = items.length;
  }, [carouselApi, isCarouselEnabled, items.length]);

  /** 초기 이미지 위치 틀어짐 방지 */
  useLayoutEffect(() => {
    if (!carouselApi || !isCarouselEnabled) return;

    carouselApi.reInit();
    carouselApi.scrollTo(carouselApi.selectedScrollSnap(), true);
  }, [carouselApi, activeBasketCount, isCarouselEnabled]);

  const highlightIndex = useMemo(
    () =>
      highlightItemId === null
        ? -1
        : items.findIndex(item => item.tournamentItemId === highlightItemId),
    [items, highlightItemId]
  );

  const hasScrolledToHighlightRef = useRef(false);

  useLayoutEffect(() => {
    if (!carouselApi || !isCarouselEnabled) return;
    if (highlightIndex < 0 || hasScrolledToHighlightRef.current) return;

    hasScrolledToHighlightRef.current = true;
    carouselApi.scrollTo(getBasketIndexForItem(highlightIndex), true);
  }, [carouselApi, isCarouselEnabled, highlightIndex]);

  useEffect(() => {
    if (!carouselApi) return;

    const handleReInit = () => {
      carouselApi.scrollTo(carouselApi.selectedScrollSnap(), true);
    };

    carouselApi.on('reInit', handleReInit);

    return () => {
      carouselApi.off('reInit', handleReInit);
    };
  }, [carouselApi]);

  const { ref: containerRef, height: containerHeight } = useContainerHeight();
  const { ref: bottomSlotRef, height: bottomSlotHeight } = useContainerHeight();
  const bottomSlotBlockHeight = bottomSlot ? (bottomSlotHeight ?? 0) + BASKET_STACK_GAP : 0;

  let basketMaxHeight: number | undefined;
  if (containerHeight) {
    basketMaxHeight = containerHeight - bottomSlotBlockHeight;
  }

  if (!isCarouselEnabled) {
    return (
      <div
        ref={containerRef}
        className="flex min-h-0 w-full flex-1 flex-col items-center justify-start gap-4"
      >
        <div style={{ width: `${BASKET_CAROUSEL_SLIDE_SIZE_PERCENT}%` }}>
          <TournamentItemBasket
            basketIndex={0}
            items={items}
            isAddItemBlocked={isAddItemBlocked}
            maxHeight={basketMaxHeight}
            participantImageMap={participantImageMap}
          />
        </div>

        {bottomSlot && <div ref={bottomSlotRef}>{bottomSlot}</div>}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-start gap-4"
    >
      <Carousel
        key={activeBasketCount}
        className={cn('relative w-full', !carouselApi && 'invisible')}
        setApi={setCarouselApi}
        opts={{ loop: false, align: 'center', containScroll: false }}
      >
        <CarouselContent className="ml-0 w-full">
          {Array.from({ length: activeBasketCount }, (_, i) => (
            <CarouselItem
              key={i}
              className="shrink-0 grow-0 pl-0"
              style={{ flex: `0 0 ${BASKET_CAROUSEL_SLIDE_SIZE_PERCENT}%` }}
            >
              <TournamentItemBasket
                basketIndex={i}
                items={items.slice(i * ITEMS_PER_BASKET, (i + 1) * ITEMS_PER_BASKET)}
                isAddItemBlocked={isAddItemBlocked}
                maxHeight={basketMaxHeight}
                participantImageMap={participantImageMap}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {bottomSlot && <div ref={bottomSlotRef}>{bottomSlot}</div>}
    </div>
  );
}

export default memo(TournamentItemBasketCarousel);
