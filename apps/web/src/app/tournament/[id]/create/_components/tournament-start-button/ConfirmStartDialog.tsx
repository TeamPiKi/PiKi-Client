'use client';

import Button from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/dialog';

import ConfirmStartFace from '../../_assets/confirm-start-face.svg';

type ConfirmStartDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

function ConfirmStartDialog({ open, onOpenChange, onConfirm }: ConfirmStartDialogProps) {
  const handleCancel = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="items-center gap-5">
        <div className="flex flex-col items-center gap-3">
          <ConfirmStartFace className="size-7.5 text-icon-neutral-secondary" aria-hidden />

          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-center heading-2-semibold text-text-neutral-primary">
              토너먼트를 바로 시작할까요?
            </DialogTitle>
            <DialogDescription className="text-center body-2-medium text-text-neutral-tertiary">
              바로 시작하면 담지 못한 친구가
              <br />
              있을 수 있어요.
            </DialogDescription>
          </div>
        </div>

        <div className="flex w-full gap-2.5">
          <Button variant="secondary" size="lg" onClick={handleCancel}>
            돌아가기
          </Button>
          <Button variant="primary" size="lg" onClick={onConfirm}>
            바로 시작하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmStartDialog;
