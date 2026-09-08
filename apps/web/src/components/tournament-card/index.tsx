import Link from 'next/link';
import type { MouseEvent } from 'react';

import { PersonIconFill } from '@/assets/icons';
import StatusChip from '@/components/status-chip';
import { ROUTES } from '@/consts/route';
import type { TournamentStatusT } from '@/types/tournament';
import { cn } from '@/utils/cn';
import type { ScrollRestorationTargetT } from '@/utils/scrollRestoration';
import { saveScrollAnchor } from '@/utils/scrollRestoration';

import ItemImageThumbnails from './ItemImageThumbnails';
import MorePopover from './MorePopover';

type TournamentCardProps = {
  tournamentId: number;
  status: TournamentStatusT;
  name: string;
  /** 토너먼트 아이템 썸네일. 최대 2개. */
  imageUrls: string[];
  /** 본인 포함 함께 담은 참여자 수. 2명 이상이면 더보기에 '친구 목록 보기' 메뉴 노출. */
  participantCount: number;
  /** 실제로 플레이한 인원 수 */
  playedCount: number;
  className?: string;
  showMorePopover?: boolean;
  scrollRestoration?: ScrollRestorationTargetT;
};

function TournamentCard({
  tournamentId,
  status,
  name,
  imageUrls = [],
  participantCount,
  playedCount,
  className,
  showMorePopover = true,
  scrollRestoration,
}: TournamentCardProps) {
  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!scrollRestoration) return;

    /** 새 탭/새 창 열기는 현재 페이지를 떠나지 않으므로 스크롤 위치를 저장하지 않는다 */
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    saveScrollAnchor(scrollRestoration, event.currentTarget, tournamentId);
  };

  const HREF = {
    PENDING: ROUTES.TOURNAMENT_CREATE(tournamentId),
    IN_PROGRESS: ROUTES.TOURNAMENT_MATCH(tournamentId),
    COMPLETED: ROUTES.TOURNAMENT_RESULT(tournamentId),
  } as const;

  return (
    <article
      className={cn(
        'relative flex w-full items-start gap-2.5 rounded-xl bg-base-50 py-3',
        showMorePopover ? 'pr-3 pl-5' : 'px-5',
        className
      )}
    >
      {/**
       * 카드 전체를 덮는 링크
       * NOTE: MorePopover와 형제로 두어 인터랙티브 요소 중첩 방지
       */}
      <Link
        href={HREF[status]}
        aria-label={name}
        data-scroll-anchor-id={tournamentId}
        onClick={handleLinkClick}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <ItemImageThumbnails imageUrls={imageUrls} />

      <div className="flex flex-1 flex-col items-start gap-2.5 self-center">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusChip status={status} />
            <div className="line-clamp-1 body-1-semibold text-text-neutral-primary">{name}</div>
          </div>

          {showMorePopover && (
            <div className="relative z-10">
              <MorePopover
                status={status}
                tournamentId={tournamentId}
                participantCount={participantCount}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 caption-1-regular">
          <PersonIconFill className="size-3 shrink-0 text-sky-blue-500" aria-hidden />
          <span className="text-text-neutral-secondary">함께 담은 {participantCount}</span>
          <div className="mx-2 h-2 w-px shrink-0 bg-border-neutral-muted" aria-hidden />
          <span className="text-text-neutral-secondary">플레이한 {playedCount}</span>
        </div>
      </div>
    </article>
  );
}

export default TournamentCard;
