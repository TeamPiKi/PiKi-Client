'use client';

import BaseImage from '@/components/base-image';
import Button from '@/components/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/drawer';
import Skeleton from '@/components/skeleton';
import type { UserIdentityTypeT } from '@/types/user';

type WelcomeJoinDialogProps = {
  userIdentityType: UserIdentityTypeT;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nickname: string;
  profileImage: string;
  tournamentName: string;
  itemCount: number;
  participantCount: number;
  onConfirm: () => void;
};

function WelcomeJoinDialog({
  userIdentityType,
  open,
  onOpenChange,
  nickname,
  profileImage,
  tournamentName,
  itemCount,
  participantCount,
  onConfirm,
}: WelcomeJoinDialogProps) {
  if (userIdentityType === 'MEMBER') {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} dismissible={false}>
        <DrawerContent>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative size-[34px] overflow-hidden rounded-full">
                <BaseImage
                  src={profileImage}
                  alt={`${nickname} 프로필 이미지`}
                  sizes="34px"
                  className="object-cover"
                  loadingFallback={<Skeleton shape="circle" className="absolute inset-0" />}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <DrawerTitle className="heading-1-bold text-text-neutral-primary">
                  {nickname}
                </DrawerTitle>
                <DrawerDescription className="text-center body-1-medium text-text-neutral-secondary">
                  이 이름으로 참여할게요.
                </DrawerDescription>
              </div>
            </div>

            <div className="flex w-full flex-col gap-1 rounded-xl bg-gray-50 p-4">
              <p className="body-1-semibold text-text-neutral-primary">{tournamentName}</p>
              <p className="body-2-medium text-text-neutral-secondary">
                후보 {itemCount}개 · 참여 {participantCount}명
              </p>
            </div>

            <Button size="lg" variant="primary" className="w-full" onClick={onConfirm}>
              시작하기
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={false}>
      <DrawerContent>
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative size-12.5 overflow-hidden rounded-full">
              <BaseImage
                src={profileImage}
                alt={`${nickname} 프로필 이미지`}
                sizes="50px"
                className="object-cover"
                loadingFallback={<Skeleton shape="circle" className="absolute inset-0" />}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <DrawerTitle className="heading-1-bold text-text-neutral-primary">
                {nickname}님,
              </DrawerTitle>
              <DrawerDescription className="text-center body-1-medium text-text-neutral-tertiary">
                프로필 등록이 완료됐어요
                <br />
                상품을 담아보세요!
              </DrawerDescription>
            </div>
          </div>

          <Button size="lg" variant="primary" className="w-full" onClick={onConfirm}>
            시작하기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default WelcomeJoinDialog;
