import Image from 'next/image';

import Spacing from '@/components/spacing';

import ItemInfoCard from './ItemInfoCard';
import ItemLinkBanner from './ItemLinkBanner';
import ItemMemoCard from './ItemMemoCard';
import { ITEM_IMAGE_SIZES } from './itemInfoScreen.const';
import type { MemoT, PriceRefreshT, ReadyItemInfoT } from './itemInfoScreen.type';

type ItemDetailViewProps = {
  item: ReadyItemInfoT;
  memo?: MemoT;
  priceRefresh?: PriceRefreshT;
  /** 없으면 조회 전용 — 수정 버튼을 노출하지 않는다 */
  onEdit?: () => void;
};

/** 정보를 정상적으로 가져온 상품의 조회 화면 */
function ItemDetailView({ item, memo, priceRefresh, onEdit }: ItemDetailViewProps) {
  return (
    <>
      <div className="relative mt-5 aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
        <Image
          src={item.imageUrl}
          alt="상품 이미지"
          fill
          preload
          sizes={ITEM_IMAGE_SIZES}
          className="object-cover"
        />
        {item.sourceUrl && <ItemLinkBanner sourceUrl={item.sourceUrl} />}
      </div>

      <Spacing size={12} />

      <ItemInfoCard
        name={item.name}
        price={item.price}
        priceRefresh={priceRefresh}
        onEdit={onEdit}
      />

      {memo && (
        <>
          <Spacing size={12} />
          <ItemMemoCard memo={memo.value} onSave={memo.save} />
        </>
      )}
    </>
  );
}

export default ItemDetailView;
