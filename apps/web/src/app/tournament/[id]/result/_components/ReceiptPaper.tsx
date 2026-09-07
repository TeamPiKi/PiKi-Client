import { Kode_Mono } from 'next/font/google';
import Link from 'next/link';
import { forwardRef } from 'react';

import PikiLogo from '@/assets/images/piki-logo-cart.svg';
import ReceiptZigzag from '@/assets/images/tournament/result/receipt-zigzag.svg';
import TrophyBadge from '@/assets/images/tournament/result/trophy-badge.svg';
import { ROUTES } from '@/consts/route';
import { cn } from '@/utils/cn';

import type { RankedProductT } from '../../_common/_types/tournament';
import { formatDate, formatPrice, formatTime } from '../_utils/formatReceipt';

const kodeMono = Kode_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

type ReceiptPaperProps = {
  tournamentId: number;
  tournamentName: string;
  result: RankedProductT[];
  date: Date;
};

const SectionDivider = () => (
  <div className="px-5">
    <div className="h-px w-full border-t border-dashed border-gray-100" />
  </div>
);

/**
 * 영수증 구분선 라벨. `*****Label*****` 형태로, 라벨 길이에 상관없이 항상
 * 영수증 전체 폭을 채우도록 양옆 별표가 가용 공간만큼 자동으로 늘어난다.
 */
const PlaceLabel = ({ label }: { label: string }) => (
  <div
    className={cn(kodeMono.className, 'flex items-center gap-1 px-5 text-text-neutral-secondary')}
  >
    <span aria-hidden className="flex-1 overflow-hidden text-[10px] leading-4.5 whitespace-nowrap">
      {'*'.repeat(60)}
    </span>
    <span className="shrink-0 text-[12px] leading-4.5 tracking-[-0.4px]">{label}</span>
    <span
      aria-hidden
      className="flex-1 overflow-hidden text-end text-[10px] leading-4.5 whitespace-nowrap"
    >
      {'*'.repeat(60)}
    </span>
  </div>
);

const ReceiptPaper = forwardRef<HTMLDivElement, ReceiptPaperProps>(function ReceiptPaper(
  { tournamentId, tournamentName, result, date },
  ref
) {
  // 응답 배열 순서에 의존하지 않고 rank 기준으로 정렬 — 1위는 별도 강조 카드.
  const sortedResult = [...result].sort((a, b) => a.rank - b.rank);
  const first = sortedResult.find(item => item.rank === 1);
  const rest = sortedResult.filter(item => item.rank !== 1);

  return (
    <div
      ref={ref}
      className="relative flex w-full flex-col gap-3 bg-bg-layer-default pt-6 filter-[drop-shadow(0px_2px_4px_rgba(0,0,0,0.12))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 left-0 h-15.25 w-full bg-linear-to-t from-white to-[#f9f9f9]"
      />

      {/* PiKi 로고 + 헤드라인 */}
      <div className="relative flex flex-col items-center gap-2">
        <PikiLogo aria-label="PiKi" className="h-14 w-19.25 shrink-0 text-gray-800" />
        <p
          className={cn(
            kodeMono.className,
            'text-center text-[12px] leading-4 font-semibold tracking-[-0.4px] text-text-neutral-tertiary'
          )}
        >
          FROM WISH TO PICK
        </p>
      </div>

      <div className="flex flex-col">
        {/* 날짜 / 시간 */}
        <div className={cn(kodeMono.className, 'flex items-center justify-between px-5')}>
          <span className="caption-1-semibold text-text-neutral-tertiary">{formatDate(date)}</span>
          <span className="caption-1-semibold text-text-neutral-tertiary">{formatTime(date)}</span>
        </div>

        <SectionDivider />

        {/* 토너먼트 이름 */}
        <div className="flex flex-col px-5 py-2">
          <p className="body-2-semibold text-text-neutral-primary">{tournamentName}</p>
        </div>

        {/* 1st Place */}
        {first && (
          <div className="flex flex-col gap-3">
            <PlaceLabel label="1st Place" />
            <ProductCard tournamentId={tournamentId} product={first} highlight />
          </div>
        )}

        {/* Others */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 pb-5">
            <PlaceLabel label="Others" />
            <ul className="flex flex-col gap-5">
              {rest.map(product => (
                <li key={product.tournamentItemId}>
                  <ProductCard tournamentId={tournamentId} product={product} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <SectionDivider />

        {/* @piki.day */}
        <p
          className={cn(
            kodeMono.className,
            'px-5 pt-3 pb-2 text-center caption-1-semibold text-text-neutral-tertiary'
          )}
        >
          @piki.day
        </p>
      </div>

      {/* 영수증 하단 톱니 */}
      <ReceiptZigzag
        aria-hidden
        preserveAspectRatio="none"
        className="pointer-events-none absolute top-full left-0 block h-4.5 w-full"
      />
    </div>
  );
});

type ProductCardProps = {
  tournamentId: number;
  product: RankedProductT;
  /** 1위 카드에 트로피 뱃지 표시 */
  highlight?: boolean;
};

/**
 * 외부 쇼핑몰 이미지 URL 을 Next.js 의 이미지 proxy(`/_next/image`) 경유 URL 로 변환.
 * 영수증 캡처 시 html-to-image 는 cross-origin 이미지를 캔버스에 그리지 못해 상품 사진만 빠진다.
 * 동일 origin 으로 가져오면 캔버스 tainted 문제가 해소된다.
 *
 * `w` 값은 next.config 의 `imageSizes` 에 포함된 값만 허용된다 (기본: 16/32/48/64/96/128/256/384).
 * 영수증 썸네일은 60x60 표시라 그 두 배인 128 이 적정.
 */
const toSameOriginImageUrl = (originalUrl: string, width = 128) =>
  `/_next/image?url=${encodeURIComponent(originalUrl)}&w=${width}&q=75`;

function ProductCard({ tournamentId, product, highlight = false }: ProductCardProps) {
  return (
    <Link
      href={ROUTES.TOURNAMENT_ITEM_EDIT(tournamentId, product.tournamentItemId)}
      className="flex cursor-pointer items-center gap-3 px-5"
    >
      <div className="relative size-15 shrink-0">
        <div className="size-full overflow-hidden rounded-md bg-gray-50">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={toSameOriginImageUrl(product.imageUrl)}
              alt={product.name}
              width={60}
              height={60}
              className="size-full object-cover"
            />
          )}
        </div>
        {highlight && (
          <TrophyBadge
            aria-label="1위"
            className="pointer-events-none absolute -top-2 -left-2 size-9"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p
          data-receipt-product-name
          className="line-clamp-2 body-2-regular break-keep text-text-neutral-primary"
        >
          {product.name}
        </p>
        <p className="body-2-semibold text-text-neutral-primary">{formatPrice(product.price)}</p>
      </div>
      <span className="sr-only">{product.rank}위</span>
    </Link>
  );
}

export default ReceiptPaper;
