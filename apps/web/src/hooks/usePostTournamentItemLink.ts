import { ERROR_CODE } from '@piki/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { postTournamentItemLink } from '@/apis/postTournamentItemLink';
import { QUERY_ACTION } from '@/consts/queryAction';
import { ROUTES } from '@/consts/route';
import { getApiErrorCode, getApiErrorStatus, isGlobalNetError } from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

type UsePostTournamentItemLinkOptionsT = {
  /** 4xx 문구를 그릴 곳 — 입력 폼처럼 화면 안에서 안내할 때 넘긴다. 생략하면 토스트 */
  onErrorMessage?: (message: string) => void;
};

export const usePostTournamentItemLink = (
  tournamentId: number,
  { onErrorMessage }: UsePostTournamentItemLinkOptionsT = {}
) => {
  const showErrorMessage = onErrorMessage ?? toast.error;

  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate: postTournamentItemLinkMutation, isPending: isPostTournamentItemLinkPending } =
    useMutation({
      mutationFn: (url: string) => postTournamentItemLink(tournamentId, url),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      },
      onError: error => {
        if (isGlobalNetError(error)) return;

        const code = getApiErrorCode(error);

        /** 토너먼트가 시작된 경우 */
        if (code === ERROR_CODE.TOURNAMENT_NOT_PENDING) {
          showErrorMessage(getApiErrorMessage(error));
          queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
          return;
        }

        /** 토너먼트가 삭제된 경우 */
        if (code === ERROR_CODE.TOURNAMENT_NOT_FOUND) {
          router.replace(
            `${ROUTES.HOME}?${QUERY_ACTION.KEY}=${QUERY_ACTION.VALUE.TOURNAMENT_NOT_FOUND}`
          );
          return;
        }

        /**
         * 400: 링크 형식 오류·미지원 쇼핑몰·아이템 32개 초과
         * 403: 토너먼트 참여 권한 없음
         */
        showErrorMessage(getApiErrorMessage(error));

        if (getApiErrorStatus(error) === 403) router.replace(ROUTES.HOME);
      },
    });

  return { postTournamentItemLinkMutation, isPostTournamentItemLinkPending };
};
