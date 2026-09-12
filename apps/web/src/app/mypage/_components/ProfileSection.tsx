'use client';

import Link from 'next/link';

import { EditIconFill } from '@/assets/icons';
import BaseImage from '@/components/base-image';
import Skeleton from '@/components/skeleton';
import { ROUTES } from '@/consts/route';
import { useGetMe } from '@/hooks/useGetMe';
import type { UserT } from '@/types/user';

function ProfileSection() {
  const { userData } = useGetMe();
  const isGuest = userData.identityType === 'GUEST';

  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="body-1-bold text-gray-900">프로필</h2>
      {/** 게스트는 닉네임 재설정 경로를 두지 않아 편집 진입점 없음 */}
      {isGuest ? (
        <div className="flex items-center gap-4 rounded-xl bg-bg-layer-default p-5">
          <ProfileSummary userData={userData} />
        </div>
      ) : (
        <Link
          href={ROUTES.MYPAGE_EDIT}
          className="flex items-center gap-4 rounded-xl bg-bg-layer-default p-5"
        >
          <ProfileSummary userData={userData} />
          <EditIconFill className="size-6 text-icon-neutral-secondary" />
        </Link>
      )}
    </section>
  );
}

type ProfileSummaryProps = {
  userData: UserT;
};

function ProfileSummary({ userData }: ProfileSummaryProps) {
  return (
    <>
      <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
        <BaseImage
          src={userData.profileImage}
          alt={`${userData.nickname} 프로필 이미지`}
          sizes="32px"
          className="object-cover"
          loadingFallback={<Skeleton shape="circle" className="absolute inset-0" />}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate body-1-bold text-text-neutral-primary">{userData.nickname}</p>
        {userData.identityType === 'MEMBER' && (
          <p className="truncate body-2-medium text-text-neutral-tertiary" data-sentry-mask>
            {userData.email}
          </p>
        )}
      </div>
    </>
  );
}

export default ProfileSection;
