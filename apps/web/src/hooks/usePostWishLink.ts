import { ERROR_CODE } from '@piki/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { postWishLink } from '@/apis/postWishLink';
import { TOAST_ACTION_DURATION_MS } from '@/components/toast/toast.const';
import { ANALYTICS_EVENT } from '@/consts/analytics';
import { ROUTES } from '@/consts/route';
import { logAnalyticsEvent } from '@/utils/analytics';
import {
  getApiErrorCode,
  getApiErrorData,
  getApiErrorStatus,
  isGlobalNetError,
} from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import { getLoginPath } from '@/utils/loginRedirect';

type UsePostWishLinkOptionsT = {
  /** 4xx 문구를 그릴 곳 — 입력 폼처럼 화면 안에서 안내할 때 넘긴다. 생략하면 토스트 */
  onErrorMessage?: (message: string) => void;
};

export const usePostWishLink = ({ onErrorMessage }: UsePostWishLinkOptionsT = {}) => {
  const showErrorMessage = onErrorMessage ?? toast.error;

  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const {
    mutate: postWishLinkMutation,
    isPending: isPostWishLinkPending,
    reset: resetPostWishLinkMutation,
  } = useMutation({
    mutationFn: (url: string) => postWishLink(url),
    onSuccess: () => {
      logAnalyticsEvent(ANALYTICS_EVENT.WISH_ADD_COMPLETE, { source: 'link' });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      if (pathname !== ROUTES.WISHLIST) router.push(ROUTES.WISHLIST);
    },
    onError: error => {
      if (isGlobalNetError(error)) return;

      if (getApiErrorCode(error) === ERROR_CODE.WISH_ALREADY_EXISTS) {
        const existingWish = getApiErrorData<{ wishId: number }>(error);

        if (typeof existingWish?.wishId === 'number') {
          toast(getApiErrorMessage(error), {
            duration: TOAST_ACTION_DURATION_MS,
            action: {
              label: '보러가기',
              onClick: () => router.push(ROUTES.WISH_EDIT(existingWish.wishId)),
            },
          });
          return;
        }

        toast.error(getApiErrorMessage(error));
        return;
      }

      /**
       * 400: 링크 형식 오류·미지원 쇼핑몰
       * 403: 게스트인 경우
       */
      showErrorMessage(getApiErrorMessage(error));

      if (getApiErrorStatus(error) === 403)
        router.replace(getLoginPath(`${window.location.pathname}${window.location.search}`));
    },
  });

  return { postWishLinkMutation, isPostWishLinkPending, resetPostWishLinkMutation };
};
