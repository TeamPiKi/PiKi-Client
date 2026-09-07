'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { usePatchTournamentNickname } from '@/app/tournament/join/_hooks/usePatchTournamentNickname';
import { usePostJoin } from '@/app/tournament/join/_hooks/usePostJoin';
import { EditIconFill } from '@/assets/icons/fill';
import Button from '@/components/button';
import type { JoinErrorTypeT } from '@/components/common/join-error-dialog';
import JoinErrorDialog from '@/components/common/join-error-dialog';
import { Header } from '@/components/header';
import Input from '@/components/input';
import { QUERY_ACTION } from '@/consts/queryAction';
import { ROUTES } from '@/consts/route';
import { useGetMe } from '@/hooks/useGetMe';
import { useNicknameValidation } from '@/hooks/useNicknameValidation';
import { usePageBackground } from '@/hooks/usePageBackground';
import { usePatchMe } from '@/hooks/usePatchMe';
import type { GetInvitePreviewResponseT } from '@/types/tournament';

type JoinPreviewClientProps = {
  tournamentId: number;
  /** 친구 초대 코드 — 링크 query 로 전달됨. join 호출 시 필수 */
  inviteCode: string;
  /** 링크 유효성과 함께 RSC 가 이미 조회한 미리보기 */
  preview: GetInvitePreviewResponseT;
};

const MAX_NICKNAME_LENGTH = 10;

function JoinPreviewClient({ tournamentId, inviteCode, preview }: JoinPreviewClientProps) {
  /** 이 페이지는 흰색 배경(bg-layer-default) — iOS 노치 영역까지 흰색으로 칠해야 자연스럽다. */
  usePageBackground('var(--color-bg-layer-default)');

  const router = useRouter();
  const { userData } = useGetMe();
  const { patchTournamentNicknameMutation, isPatchTournamentNicknamePending } =
    usePatchTournamentNickname();

  const [nickname, setNickname] = useState(userData.nickname);
  const [joinErrorType, setJoinErrorType] = useState<JoinErrorTypeT | null>(null);

  const { postJoinMutation, isPostJoinPending } = usePostJoin({
    onAlreadyJoined: () => router.replace(ROUTES.TOURNAMENT_CREATE(tournamentId)),
    onParticipantsFull: () => setJoinErrorType('PARTICIPANTS_FULL'),
    onAlreadyStarted: () => setJoinErrorType('ALREADY_STARTED'),
    onUnavailable: () => setJoinErrorType('LINK_EXPIRED'),
    onDeleted: () => setJoinErrorType('DELETED'),
  });

  const {
    isCheckingNickname,
    isNicknameChanged,
    isNicknameValid,
    nicknameErrorText,
    trimmedNickname,
  } = useNicknameValidation(nickname, userData.nickname);

  const isComplete =
    isNicknameValid &&
    !isCheckingNickname &&
    !isPostJoinPending &&
    !isPatchTournamentNicknamePending;

  /** 참여 완료 후 뒤로가기로 join 화면에 돌아오면 재참여(409)가 되므로 히스토리에서 제거 */
  const goToTournament = useCallback(() => {
    router.replace(
      `${ROUTES.TOURNAMENT_CREATE(tournamentId)}?${QUERY_ACTION.KEY}=${QUERY_ACTION.VALUE.WELCOME_JOIN}`
    );
  }, [router, tournamentId]);

  const handleConfirm = () => {
    if (!isComplete) return;

    postJoinMutation(
      {
        tournamentId,
        body: { ...(inviteCode ? { inviteCode } : {}) },
      },
      {
        onSuccess: () => {
          if (!isNicknameChanged) {
            goToTournament();
            return;
          }

          patchTournamentNicknameMutation(
            { tournamentId, body: { nickname: trimmedNickname } },
            { onSuccess: goToTournament, onError: goToTournament }
          );
        },
      }
    );
  };

  return (
    <>
      <main className="flex min-h-dvh flex-col bg-bg-layer-default pt-padding-top pb-8">
        <Header
          center="초대 참여하기"
          centerClassName="heading-1-bold text-text-neutral-primary"
          className="px-5"
        />

        <section className="mt-8.75 flex flex-col gap-2 px-5">
          <p className="body-2-semibold text-text-neutral-primary">공유받은 토너먼트</p>
          <div className="flex flex-col gap-1 rounded-xl bg-gray-50 p-4">
            <p className="body-1-semibold text-text-neutral-primary">{preview.tournamentName}</p>
            <p className="body-2-medium text-text-neutral-secondary">
              후보 {preview.itemCount}개 · 참여 {preview.participantCount}명
            </p>
          </div>
        </section>

        <section className="mt-8 px-5">
          <Input
            label="토너먼트용 닉네임을 설정해주세요."
            value={nickname}
            onChange={event => setNickname(event.target.value)}
            right={<EditIconFill className="size-5" />}
            maxLength={MAX_NICKNAME_LENGTH}
            aria-invalid={Boolean(nicknameErrorText)}
            {...(nicknameErrorText ? { helperText: nicknameErrorText } : {})}
          />
        </section>

        <div className="mt-auto px-5">
          <Button
            size="lg"
            variant="primary"
            disabled={!isComplete}
            onClick={handleConfirm}
            isLoading={isPostJoinPending || isPatchTournamentNicknamePending}
          >
            참여하기
          </Button>
        </div>
      </main>

      {joinErrorType && <JoinErrorDialog type={joinErrorType} />}
    </>
  );
}

export default JoinPreviewClient;
