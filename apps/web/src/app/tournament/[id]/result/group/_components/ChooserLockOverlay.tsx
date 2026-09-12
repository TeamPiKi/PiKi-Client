import Link from 'next/link';

import { LockIconFill } from '@/assets/icons';
import ChooserLockIllustration from '@/assets/images/tournament/result/chooser-lock-overlay.svg';
import { ROUTES } from '@/consts/route';
import { getLoginPath } from '@/utils/loginRedirect';

type ChooserLockOverlayProps = {
  tournamentId: number;
};

function ChooserLockOverlay({ tournamentId }: ChooserLockOverlayProps) {
  return (
    <div className="relative w-full">
      <ChooserLockIllustration aria-hidden className="h-auto w-full blur-[4px]" />
      <Link
        href={getLoginPath(ROUTES.TOURNAMENT_GROUP_RESULT(tournamentId))}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      >
        <LockIconFill aria-hidden className="size-7 text-icon-neutral-primary" />
        <span className="body-2-medium text-text-neutral-secondary underline underline-offset-2">
          로그인하고 결과보기
        </span>
      </Link>
    </div>
  );
}

export default ChooserLockOverlay;
