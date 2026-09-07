import { ERROR_CODE } from '@piki/core';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ANALYTICS_EVENT } from '@/consts/analytics';
import { ROUTES } from '@/consts/route';
import { logAnalyticsEvent } from '@/utils/analytics';
import { getApiErrorCode, getApiErrorStatus, isGlobalNetError } from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { clearInviteSent } from '@/utils/inviteSentSession';

import { postTournamentStart } from '../_apis/postTournamentStart';

export const usePostTournamentStart = (tournamentId: number) => {
  const router = useRouter();

  const { mutate: postTournamentStartMutation, isPending: isPostTournamentStartPending } =
    useMutation({
      mutationFn: () => postTournamentStart(tournamentId),
      // 응답의 tournamentId 로 라우팅.
      // - 주최자: ROOT ID (요청 tournamentId 와 동일)
      // - 참여자: 새로 생성된 CLONE ID (이후 본인 인스턴스로 진행)
      onSuccess: ({ tournamentId: nextTournamentId }) => {
        clearInviteSent(tournamentId);
        logAnalyticsEvent(ANALYTICS_EVENT.TOURNAMENT_START, {
          tournament_id: nextTournamentId,
          source_tournament_id: tournamentId,
        });
        router.replace(ROUTES.TOURNAMENT_LOADING(nextTournamentId));
      },
      onError: error => {
        if (isGlobalNetError(error)) return;

        if (getApiErrorStatus(error) === 409) {
          const code = getApiErrorCode(error);

          /** 아직 시작할 수 없는 상태 — 토너먼트는 그대로 PENDING 이므로 이동시키지 않고 사유만 안내한다. */
          if (
            code === ERROR_CODE.TOURNAMENT_ITEM_NOT_READY_TO_START ||
            code === ERROR_CODE.TOURNAMENT_ITEM_PRICE_REQUIRED ||
            code === ERROR_CODE.TOURNAMENT_ITEM_INCOMPLETE
          ) {
            toast.error(getApiErrorMessage(error));
            return;
          }

          /** 그 외(PENDING 아님 = 이미 시작된 토너먼트) → 진행 중인 매치로 이동 */
          router.push(ROUTES.TOURNAMENT_MATCH(tournamentId));
          return;
        }

        /**
         * 400: 아이템 수 미충족 (2~32개)
         * 403: 토너먼트 시작 권한 없음
         * 404: 토너먼트 존재하지 않음
         */
        toast.error(getApiErrorMessage(error));
      },
    });

  return { postTournamentStartMutation, isPostTournamentStartPending };
};
