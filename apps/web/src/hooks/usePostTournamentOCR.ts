import { ERROR_CODE } from '@piki/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { postTournamentItemImages } from '@/apis/postTournamentItemImages';
import { postTournamentItemPresignedUrl } from '@/apis/postTournamentItemPresignedUrl';
import { putImageToS3 } from '@/apis/putImageToS3';
import { QUERY_ACTION } from '@/consts/queryAction';
import { ROUTES } from '@/consts/route';
import {
  createS3UploadError,
  getApiErrorCode,
  getApiErrorStatus,
  isGlobalNetError,
} from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

export const usePostTournamentOCR = (tournamentId: number) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    mutate: postTournamentOCRMutation,
    isPending: isPostTournamentOCRPending,
    reset: resetPostTournamentOCRMutation,
  } = useMutation({
    mutationFn: async (files: File[]) => {
      const { uploads } = await postTournamentItemPresignedUrl(tournamentId, {
        images: files.map(file => ({ contentType: file.type, contentLength: file.size })),
      });

      /** 일부 실패 시 전체 실패 처리 */
      if (uploads.length !== files.length)
        throw createS3UploadError(new Error('presigned 발급 개수 불일치'));

      await Promise.all(
        files.map((file, index) => {
          const upload = uploads[index];
          if (!upload) throw createS3UploadError(new Error('presigned 발급 개수 불일치'));
          return putImageToS3(upload, file);
        })
      );

      return postTournamentItemImages(tournamentId, {
        imageKeys: uploads.map(upload => upload.imageKey),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    },
    onError: error => {
      if (isGlobalNetError(error)) return;

      const code = getApiErrorCode(error);

      /** 토너먼트가 시작된 경우 */
      if (code === ERROR_CODE.TOURNAMENT_NOT_PENDING) {
        toast.error(getApiErrorMessage(error));
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
       * 400: 이미지 개수/형식/크기 초과 · UPLOAD-001/002 · 아이템 32개 초과(정원 판정이 confirm 으로 미뤄짐)
       * 403: 토너먼트 참여 권한 없음
       * S3 PUT 실패(S3UploadError)·502 STORAGE-002/003 은 전역(isGlobalNetError)이 처리
       */
      toast.error(getApiErrorMessage(error));

      if (getApiErrorStatus(error) === 403) router.replace(ROUTES.HOME);
    },
  });

  return { postTournamentOCRMutation, isPostTournamentOCRPending, resetPostTournamentOCRMutation };
};
