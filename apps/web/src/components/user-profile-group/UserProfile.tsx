import Image from 'next/image';

import HostBadge from '@/components/common/host-badge';
import { cn } from '@/utils/cn';

import type { UserT } from './userProfile.types';

type UserProfileProps = {
  user: UserT;
  className?: string;
};

function UserProfile({ user, className }: UserProfileProps) {
  const profileImage = (
    <span
      className={cn(
        'relative block size-6.75 shrink-0 overflow-hidden rounded-full border-[1.6px] border-white',
        className
      )}
    >
      <Image
        src={user.imageUrl}
        alt={`${user.name} 프로필 이미지`}
        fill
        sizes="27px"
        className="object-cover"
      />
    </span>
  );

  if (!user.isHost) return profileImage;

  return (
    <span className="relative inline-block shrink-0">
      {profileImage}
      <span className="pointer-events-none absolute -bottom-px -right-1.5">
        <HostBadge />
      </span>
    </span>
  );
}

export default UserProfile;
