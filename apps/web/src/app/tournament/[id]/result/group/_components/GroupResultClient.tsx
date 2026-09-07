'use client';

import { Kode_Mono } from 'next/font/google';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  ChevronBackwardIconFill,
  ChevronDownIconFill,
  ChevronUpIconFill,
} from '@/assets/icons/fill';
import PikiLogo from '@/assets/images/piki-logo-cart.svg';
import ReceiptZigzag from '@/assets/images/tournament/result/receipt-zigzag.svg';
import TrophyBadge from '@/assets/images/tournament/result/trophy-badge.svg';
import Spinner from '@/components/spinner';
import { ROUTES } from '@/consts/route';
import { useBackWithFallback } from '@/hooks/useBackWithFallback';
import { cn } from '@/utils/cn';

import { useGetTournament } from '../../../_common/_hooks/useGetTournament';
import ReceiptDrawMachine from '../../_components/ReceiptDrawMachine';
import { useGetGroupResult } from '../../_hooks/useGetGroupResult';
import type { GroupResultItemT } from '../../_types/groupResult';
import { formatDate, formatTime } from '../../_utils/formatReceipt';

const kodeMono = Kode_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

type GroupResultClientProps = {
  tournamentId: number;
};

const SectionDivider = () => <div className="h-px w-full border-t border-dashed border-gray-100" />;

const GroupResultShell = ({ onBack, children }: { onBack: () => void; children: ReactNode }) => (
  <main className="flex min-h-dvh flex-col bg-bg-layer-basement pt-padding-top pb-8">
    <header className="relative flex h-7.5 w-full shrink-0 items-center px-5">
      <button
        type="button"
        aria-label="뒤로가기"
        onClick={onBack}
        className="cursor-pointer p-0.75"
      >
        <ChevronBackwardIconFill className="size-6 text-icon-neutral-secondary" />
      </button>
      <h1 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 heading-1-bold text-text-neutral-primary">
        친구 토너먼트 결과
      </h1>
    </header>
    {children}
  </main>
);

/**
 * 영수증 구분선 라벨. 라벨 길이에 상관없이 항상 영수증 전체 폭을 채우도록
 * 양옆 별표가 가용 공간만큼 자동으로 늘어난다.
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

function GroupResultClient({ tournamentId }: GroupResultClientProps) {
  const backWithFallback = useBackWithFallback();
  const { tournamentData } = useGetTournament(tournamentId);
  // 그룹 결과는 원본(ROOT) 단위로 집계된다. CLONE 에서 진입하면 원본 id 로 조회한다.
  const groupResultTournamentId =
    'sourceTournamentId' in tournamentData && tournamentData.sourceTournamentId
      ? tournamentData.sourceTournamentId
      : tournamentId;
  const { groupResultData, isGroupResultPending, isGroupResultError } =
    useGetGroupResult(groupResultTournamentId);

  const date = new Date();
  const tournamentName = tournamentData.name;
  const handleBack = () => backWithFallback(ROUTES.TOURNAMENT_RESULT(tournamentId));

  if (isGroupResultPending) {
    return (
      <GroupResultShell onBack={handleBack}>
        <div className="flex flex-1 items-center justify-center px-5">
          <Spinner size={32} />
        </div>
      </GroupResultShell>
    );
  }

  const chosenItems = groupResultData?.items.filter(item => item.chosenBy.length > 0) ?? [];
  if (isGroupResultError || !groupResultData || chosenItems.length === 0) {
    return (
      <GroupResultShell onBack={handleBack}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5">
          <p className="heading-1-bold text-text-neutral-primary">아직 친구 결과가 없어요</p>
          <p className="text-center body-1-medium text-text-neutral-tertiary">
            친구가 토너먼트를 완료하면
            <br />
            결과를 비교해볼 수 있어요.
          </p>
        </div>
      </GroupResultShell>
    );
  }

  const sortedItems = [...chosenItems].sort((a, b) => a.rank - b.rank);
  const firstItem = sortedItems.find(item => item.rank === 1);
  const otherItems = sortedItems.filter(item => item.rank !== 1);

  return (
    <GroupResultShell onBack={handleBack}>
      <div className="mx-auto mt-5 flex w-full max-w-105 flex-1 flex-col px-5">
        <ReceiptDrawMachine>
          <div className="relative flex w-full flex-col gap-2 bg-bg-layer-default pt-6 pb-6.25 filter-[drop-shadow(0px_2px_4px_rgba(0,0,0,0.12))]">
            {/* PiKi 로고 + 헤드라인 */}
            <div className="relative flex flex-col items-center gap-2">
              <PikiLogo aria-label="PiKi" className="h-14 w-19.25 shrink-0 text-gray-800" />
              <p
                className={cn(
                  kodeMono.className,
                  'text-center text-[12px] leading-4 font-semibold tracking-[-0.4px] text-text-neutral-secondary'
                )}
              >
                FROM WISH TO PICK
              </p>
            </div>

            <div className="flex flex-col">
              {/* 날짜 / 시간 */}
              <div className={cn(kodeMono.className, 'flex items-center justify-between px-5')}>
                <span className="caption-1-semibold text-text-neutral-secondary">
                  {formatDate(date)}
                </span>
                <span className="caption-1-semibold text-text-neutral-secondary">
                  {formatTime(date)}
                </span>
              </div>

              <SectionDivider />

              {/* 토너먼트 이름 */}
              <div className="flex flex-col px-5 py-2">
                <p className="body-2-semibold text-text-neutral-primary">{tournamentName}</p>
              </div>

              {/* 1st Place — 트로피 */}
              {firstItem && (
                <div className="flex flex-col gap-3 py-3">
                  <PlaceLabel label="1st Place" />
                  <GroupProductCard item={firstItem} highlight />
                </div>
              )}

              {/* Others — 상품 카드 리스트 */}
              {otherItems.length > 0 && (
                <div className="flex flex-col gap-3 py-3">
                  <PlaceLabel label="Others" />
                  <ul className="flex flex-col gap-3">
                    {otherItems.map(item => (
                      <li key={`${item.rank}-${item.itemId}`}>
                        <GroupProductCard item={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <SectionDivider />

              <p
                className={cn(
                  kodeMono.className,
                  'px-5 py-2 text-center caption-1-semibold text-text-neutral-secondary'
                )}
              >
                @piki.day
              </p>
            </div>

            <ReceiptZigzag
              aria-hidden
              preserveAspectRatio="none"
              className="pointer-events-none absolute top-full left-0 block h-4.5 w-full"
            />
          </div>
        </ReceiptDrawMachine>
      </div>
    </GroupResultShell>
  );
}

type GroupProductCardProps = {
  item: GroupResultItemT;
  /** 1위 카드에 트로피 뱃지 표시 */
  highlight?: boolean;
};

const MAX_PROFILE_STACK = 3;

function GroupProductCard({ item, highlight = false }: GroupProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const count = item.chosenBy.length;
  const visibleChoosers = item.chosenBy.slice(0, MAX_PROFILE_STACK);
  const extraCount = Math.max(0, count - MAX_PROFILE_STACK);

  return (
    <div className="flex flex-col gap-3 px-5">
      <div className="flex items-center gap-3">
        <div className="relative size-15 shrink-0">
          <div className="size-full overflow-hidden rounded-md bg-gray-50">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                width={60}
                height={60}
                className="size-full object-cover"
              />
            ) : null}
          </div>
          {highlight && (
            <TrophyBadge
              aria-label="1위"
              className="pointer-events-none absolute -top-2 -left-2 size-8"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="line-clamp-2 body-2-regular break-keep text-text-neutral-primary">
            {item.name}
          </p>
          {count > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              aria-expanded={isExpanded}
              className="flex cursor-pointer items-center gap-1.5 self-start"
            >
              <ul className="flex items-center">
                {visibleChoosers.map((chooser, idx) => (
                  <li key={chooser.userId} className={cn(idx !== 0 && '-ml-1.5')}>
                    <Image
                      src={chooser.profileImage}
                      alt={chooser.nickname}
                      width={20}
                      height={20}
                      className="size-5 rounded-full border border-white bg-gray-50 object-cover"
                      unoptimized
                    />
                  </li>
                ))}
                {extraCount > 0 && (
                  <li className="caption-2-semibold -ml-1.5 flex size-5 items-center justify-center rounded-full border border-white bg-gray-100 text-text-neutral-secondary">
                    +{extraCount}
                  </li>
                )}
              </ul>
              <span className="caption-1-semibold text-text-accent">{count}명</span>
              {isExpanded ? (
                <ChevronUpIconFill className="size-4 text-text-accent" />
              ) : (
                <ChevronDownIconFill className="size-4 text-text-accent" />
              )}
            </button>
          )}
        </div>
      </div>

      {isExpanded && count > 0 && (
        <ul className="flex flex-wrap gap-2">
          {item.chosenBy.map(chooser => (
            <li
              key={chooser.userId}
              className="flex items-center gap-1.5 rounded-full bg-gray-50 py-1 pr-3 pl-1"
            >
              <Image
                src={chooser.profileImage}
                alt={chooser.nickname}
                width={20}
                height={20}
                className="size-5 rounded-full bg-gray-50 object-cover"
                unoptimized
              />
              <span className="caption-1-semibold text-text-neutral-primary">
                {chooser.nickname}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GroupResultClient;
