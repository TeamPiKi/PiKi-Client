'use client';

import { useMemo } from 'react';

import { useGetGroupResult } from '@/app/tournament/[id]/result/_hooks/useGetGroupResult';
import { ProfileCircledFilledIconOutline } from '@/assets/icons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/dialog';
import Spinner from '@/components/spinner';
import UserProfile from '@/components/user-profile-group/UserProfile';
import type { UserT } from '@/components/user-profile-group/userProfile.types';
import { useGetMe } from '@/hooks/useGetMe';

type FriendListItemT = {
  key: string;
  nickname: string;
  profileImage: string;
  /** 본인 여부 — true 면 우측에 "나" 배지 표시 */
  isMe?: boolean;
};

type FriendListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** group-result API 호출용. COMPLETED 토너먼트에서만 의미 있음. */
  tournamentId: number;
};

const toUser = (friend: FriendListItemT): UserT => ({
  id: friend.key,
  name: friend.nickname,
  imageUrl: friend.profileImage,
});

function FriendListDialog({ open, onOpenChange, tournamentId }: FriendListDialogProps) {
  // 모달이 열렸을 때만 group-result fetch.
  const { groupResultData, isGroupResultPending, isGroupResultError } = useGetGroupResult(
    tournamentId,
    { enabled: open }
  );
  const { userData } = useGetMe();
  const myUserId = userData.id;

  // group-result 의 모든 chosenBy 를 합쳐 userId 기준 dedup.
  // 마스킹 참여자(게스트 조회)는 userId 가 null 이라 아이템·순서 기반 합성 키로 각각 별도 행으로 남긴다.
  const friends = useMemo<FriendListItemT[]>(() => {
    if (!groupResultData) return [];
    const map = new Map<string, FriendListItemT>();
    for (const item of groupResultData.items) {
      item.chosenBy.forEach((participant, index) => {
        const key = participant.userId ?? `masked-${item.itemId}-${index}`;
        if (map.has(key)) return;
        map.set(key, {
          key,
          nickname: participant.nickname,
          profileImage: participant.profileImage,
          isMe: participant.userId === myUserId,
        });
      });
    }
    // 본인 먼저 노출.
    return Array.from(map.values()).sort(
      (a, b) => Number(b.isMe ?? false) - Number(a.isMe ?? false)
    );
  }, [groupResultData, myUserId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-4 p-5">
        <DialogTitle className="text-center heading-1-bold text-text-neutral-primary">
          친구 목록 보기
        </DialogTitle>
        <DialogDescription className="sr-only">
          이 토너먼트에 참여한 친구 목록입니다.
        </DialogDescription>

        <FriendListBody
          isPending={isGroupResultPending}
          isError={isGroupResultError}
          friends={friends}
        />
      </DialogContent>
    </Dialog>
  );
}

type FriendListBodyProps = {
  isPending: boolean;
  isError: boolean;
  friends: FriendListItemT[];
};

function FriendListBody({ isPending, isError, friends }: FriendListBodyProps) {
  if (isPending) {
    return (
      <div className="flex h-50 items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  /** 조회 실패를 빈 목록으로 뭉뚱그리면 "친구 없음" 으로 잘못 안내된다 */
  if (isError) {
    return (
      <p className="py-10 text-center body-1-medium text-text-neutral-tertiary">
        친구 목록을 불러오지 못했어요.
      </p>
    );
  }

  if (friends.length === 0) {
    return (
      <p className="py-10 text-center body-1-medium text-text-neutral-tertiary">
        참여한 친구가 없어요.
      </p>
    );
  }

  // 스크롤 영역 — 약 400px 안에서 4명 정도 노출, 나머지는 내부 스크롤
  return (
    <ul className="hide-scrollbar flex max-h-100 flex-col gap-2 overflow-y-auto">
      {friends.map(friend => (
        <li key={friend.key}>
          <FriendRow friend={friend} />
        </li>
      ))}
    </ul>
  );
}

type FriendRowProps = {
  friend: FriendListItemT;
};

function FriendRow({ friend }: FriendRowProps) {
  const user = toUser(friend);

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-layer-basement p-5">
      <div className="flex min-w-0 items-center gap-4">
        <UserProfile user={user} className="size-8 border-0" />
        <span className="truncate body-1-bold text-text-neutral-primary">{friend.nickname}</span>
      </div>
      {friend.isMe && (
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-black/4 px-2 py-1 body-2-semibold text-text-neutral-secondary">
          <ProfileCircledFilledIconOutline
            className="size-5 text-icon-neutral-secondary"
            aria-hidden
          />
          나
        </span>
      )}
    </div>
  );
}

export default FriendListDialog;
