import Image from 'next/image';

import { Z_INDEX } from '@/consts/zIndex';
import { useGetMe } from '@/hooks/useGetMe';

import type { PendingTournamentItemT } from '../../../_common/_types/tournamentResponse';
import ProductImage from './ProductImage';
import './TournamentBasketItem.css';

type TournamentBasketItemProps = {
  item: PendingTournamentItemT;
  index: number;
  participantImageMap?: Map<string, string>;
  /** 알림에서 진입해 이 카드가 대상인 경우 */
  isHighlighted?: boolean;
};

/** 바스켓 타일 — 순수 표시용. 클릭 동작은 감싸는 Link·button 이 담당한다 */
function TournamentBasketItem({
  item,
  index,
  participantImageMap,
  isHighlighted = false,
}: TournamentBasketItemProps) {
  const { userData } = useGetMe();
  const friendImageUrl =
    item.userId && item.userId !== userData.id ? participantImageMap?.get(item.userId) : null;

  return (
    <div className="relative aspect-square w-full">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <ProductImage
          {...(item.imageUrl ? { src: item.imageUrl } : {})}
          alt={`토너먼트 아이템 ${index + 1}`}
          status={item.status}
          {...(isHighlighted && { className: 'tbi-highlight' })}
        />
      </div>
      {isHighlighted && (
        <span
          aria-hidden
          className="tbi-highlight-ring pointer-events-none absolute inset-0 rounded-2xl"
        />
      )}
      {friendImageUrl && (
        <div
          className="absolute -right-1 -bottom-0.5 overflow-hidden rounded-full border-2 border-white"
          style={{ width: '35%', height: '35%', zIndex: Z_INDEX.BASE_IMAGE + 10 }}
        >
          <Image src={friendImageUrl} alt="친구 프로필" fill className="object-cover" />
        </div>
      )}
    </div>
  );
}

export default TournamentBasketItem;
