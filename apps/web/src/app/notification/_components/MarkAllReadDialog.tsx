'use client';

import { toast } from 'sonner';

import ConfirmDialog from '@/components/common/confirm-dialog';
import { usePostNotificationsRead } from '@/hooks/usePostNotificationsRead';

type MarkAllReadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function MarkAllReadDialog({ open, onOpenChange }: MarkAllReadDialogProps) {
  const { postNotificationsReadMutation, isPostNotificationsReadPending } =
    usePostNotificationsRead();

  const handleConfirm = () => {
    if (isPostNotificationsReadPending) return;
    postNotificationsReadMutation(
      { all: true },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('알림을 모두 읽음 처리했어요');
        },
      }
    );
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={null}
      title="알림을 모두 읽음 처리하시겠어요?"
      description="14일 이후 자동 삭제돼요."
      confirmLabel="읽음 처리하기"
      cancelLabel="취소하기"
      isPending={isPostNotificationsReadPending}
      onConfirm={handleConfirm}
    />
  );
}

export default MarkAllReadDialog;
