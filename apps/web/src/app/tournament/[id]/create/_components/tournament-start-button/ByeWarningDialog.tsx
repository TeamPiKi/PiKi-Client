'use client';

import { AlertIconFill } from '@/assets/icons/fill';
import Button from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/dialog';

type ByeWarningDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMore: () => void;
  onConfirm: () => void;
  /** 참여자는 후보를 더 담을 수 없어 확인 버튼 하나만 노출한다 */
  isParticipant?: boolean;
};

function ByeWarningDialog({
  open,
  onOpenChange,
  onAddMore,
  onConfirm,
  isParticipant = false,
}: ByeWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="items-center gap-5">
        <div className="flex flex-col items-center gap-3">
          <AlertIconFill className="size-10 text-icon-neutral-secondary" aria-hidden />

          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-center heading-2-semibold text-text-neutral-primary">
              부전승이 포함돼요
            </DialogTitle>
            <DialogDescription className="text-center body-2-medium text-text-neutral-tertiary">
              상품 수가 2, 4, 8, 16, 32개가 아니면
              <br />
              일부 상품은 자동으로 다음 라운드에 올라가요.
            </DialogDescription>
          </div>
        </div>

        {isParticipant ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onConfirm}>
            확인하고 시작하기
          </Button>
        ) : (
          <div className="flex w-full gap-2.5">
            <Button variant="secondary" size="lg" onClick={onAddMore}>
              상품 더 담기
            </Button>
            <Button variant="primary" size="lg" onClick={onConfirm}>
              시작하기
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ByeWarningDialog;
