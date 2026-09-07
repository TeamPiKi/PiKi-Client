import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { patchMe } from '@/apis/patchMe';
import { postProfileImagePresignedUrl } from '@/apis/postProfileImagePresignedUrl';
import { putImageToS3 } from '@/apis/putImageToS3';
import { QUERY_KEYS } from '@/consts/queryKeys';
import { isGlobalNetError } from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

export const usePatchMe = () => {
  const queryClient = useQueryClient();

  const { mutate: patchMeMutation, isPending: isPatchMePending } = useMutation({
    /** 이미지는 presign → S3 직접 PUT → imageKey 확정 순서로 올린다 */
    mutationFn: async ({ image, nickname }: { image?: File; nickname?: string }) => {
      let imageKey: string | undefined;

      if (image) {
        const upload = await postProfileImagePresignedUrl({ contentType: image.type });
        await putImageToS3(upload, image);
        imageKey = upload.imageKey;
      }

      return patchMe({
        ...(nickname ? { nickname } : {}),
        ...(imageKey ? { imageKey } : {}),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.ME });
    },
    onError: error => {
      if (isGlobalNetError(error)) return;

      /**
       * 400: 닉네임 형식 오류 · 이미지 형식/내용 오류(USER-009/010/011) · key 오류(UPLOAD-001/002)
       * 403: 게스트는 프로필 이미지 변경 불가(USER-008)
       * 409: 중복 닉네임(USER-004)
       * S3 PUT 실패(S3UploadError)·502 STORAGE-00x 는 전역(isGlobalNetError)이 처리
       */
      toast.error(getApiErrorMessage(error));
    },
  });

  return { patchMeMutation, isPatchMePending };
};
