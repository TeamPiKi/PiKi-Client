'use client';

import { FireIconFill } from '@/assets/icons/fill';
import Button from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/dialog';

type OwnerStartedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "토너먼트 시작하기" — 본인(CLONE) 시작 흐름 진입 */
  onStart: () => void;
  /** 담긴 후보 수 — "N강" 표시에 그대로 사용 */
  itemCount: number;
  /** 시작 mutation 진행 중 여부 — 빠른 연타로 인한 중복 호출을 막기 위해 버튼을 비활성한다. */
  isPending?: boolean;
};

/**
 * 주최자가 ROOT 토너먼트를 시작한 사실을 참여자에게 알리는 모달.
 * SSE(TOURNAMENT_STARTED) 또는 폴링으로 `ownerStarted: false → true` 변화를 감지해 자동 노출된다.
 */
function OwnerStartedDialog({
  open,
  onOpenChange,
  onStart,
  itemCount,
  isPending = false,
}: OwnerStartedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="items-center gap-5">
        <FireIconFill className="size-10 text-icon-neutral-secondary" aria-hidden />

        <div className="flex flex-col items-center gap-1">
          <DialogTitle className="text-center heading-2-semibold text-text-neutral-primary">
            주최자가 토너먼트를 시작했어요!
          </DialogTitle>
          <DialogDescription className="text-center body-2-medium text-text-neutral-tertiary">
            지금 바로 {itemCount}강 토너먼트를 시작해 보세요.
          </DialogDescription>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onStart}
          disabled={isPending}
        >
          토너먼트 시작하기
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default OwnerStartedDialog;
