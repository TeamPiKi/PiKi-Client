import ImageIconOutline from '@/assets/icons/outline/image.svg';
import BaseImage from '@/components/base-image';
import Skeleton from '@/components/skeleton';
import formatPrice from '@/utils/formatPrice';

/** READY 위시 카드 — 이미지·상품명·가격·커머스 칩 */
type WishReadyCardProps = {
  name: string | null;
  price: number | null;
  imageUrl: string | null;
  sourcePlatform?: string | null;
  preload?: boolean;
};

function WishReadyCard({
  name,
  price,
  imageUrl,
  sourcePlatform,
  preload = false,
}: WishReadyCardProps) {
  return (
    <div className="flex flex-col overflow-hidden bg-bg-layer-basement">
      {/* 이미지 */}
      <div className="relative aspect-[201/166] w-full bg-bg-layer-basement">
        {imageUrl ? (
          <BaseImage
            src={imageUrl}
            alt={name ?? ''}
            sizes="(max-width: 480px) 50vw, 240px"
            preload={preload}
            loadingFallback={<Skeleton className="absolute inset-0 rounded-none" />}
            errorFallback={
              <div className="absolute inset-0 flex items-center justify-center text-gray-200">
                <ImageIconOutline width={40} height={40} />
              </div>
            }
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-200">
            <ImageIconOutline width={40} height={40} />
          </div>
        )}
      </div>

      {/* 상품명 + 가격 + 커머스칩 */}
      <div className="flex h-[124px] flex-col items-start gap-2.5 self-stretch p-4">
        <div className="flex flex-col gap-1 self-stretch">
          <p className="line-clamp-2 self-stretch body-2-medium text-text-neutral-primary">
            {name}
          </p>
          <p className="body-2-semibold text-text-neutral-primary">{formatPrice(String(price))}</p>
        </div>
        {sourcePlatform && (
          <span className="flex h-5 items-center rounded-[4px] bg-gray-75 px-1.5 caption-1-regular text-text-neutral-secondary">
            {sourcePlatform}
          </span>
        )}
      </div>
    </div>
  );
}

export default WishReadyCard;
