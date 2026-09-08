import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { postWishImages } from '@/apis/postWishImages';
import { postWishPresignedUrl } from '@/apis/postWishPresignedUrl';
import { putImageToS3 } from '@/apis/putImageToS3';
import { ANALYTICS_EVENT } from '@/consts/analytics';
import { ROUTES } from '@/consts/route';
import { logAnalyticsEvent } from '@/utils/analytics';
import { createS3UploadError, getApiErrorStatus, isGlobalNetError } from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { getLoginPath } from '@/utils/loginRedirect';

export const usePostWishOCR = () => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const {
    mutate: postWishOCRMutation,
    isPending: isPostWishOCRPending,
    reset: resetPostWishOCRMutation,
  } = useMutation({
    mutationFn: async (files: File[]) => {
      const { uploads } = await postWishPresignedUrl({
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

      return postWishImages({ imageKeys: uploads.map(upload => upload.imageKey) });
    },
    onSuccess: () => {
      logAnalyticsEvent(ANALYTICS_EVENT.WISH_ADD_COMPLETE, { source: 'ocr' });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      if (pathname !== ROUTES.WISHLIST) router.push(ROUTES.WISHLIST);
    },
    onError: error => {
      if (isGlobalNetError(error)) return;

      /**
       * 400: 이미지 개수/형식/크기 초과 · UPLOAD-001/002(발급 형식 아님·업로드 미완)
       * 403: 게스트인 경우
       * S3 PUT 실패(S3UploadError)·502 STORAGE-002/003 은 전역(isGlobalNetError)이 처리
       */
      toast.error(getApiErrorMessage(error));

      if (getApiErrorStatus(error) === 403)
        router.replace(getLoginPath(`${window.location.pathname}${window.location.search}`));
    },
  });

  return { postWishOCRMutation, isPostWishOCRPending, resetPostWishOCRMutation };
};
