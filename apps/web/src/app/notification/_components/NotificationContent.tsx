'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CheckCircledIconOutline } from '@/assets/icons';
import Button from '@/components/button';
import { cn } from '@/utils/cn';
import { formatTimeKo } from '@/utils/formatDate';
import { isWebview } from '@/utils/webBridge';

import { useGetNotifications } from '../_hooks/useGetNotifications';
import useIntersectionObserver from '../_hooks/useIntersectionObserver';
import { usePostNotificationsRead } from '../_hooks/usePostNotificationsRead';
import { usePushPermission } from '../_hooks/usePushPermission';
import { getNotificationRoute } from '../_utils/getNotificationRoute';
import MarkAllReadDialog from './MarkAllReadDialog';
import NotificationItem from './NotificationItem';
import NotificationStateCard from './NotificationStateCard';
import PushDisabledBanner from './PushDisabledBanner';

function NotificationContent() {
  const router = useRouter();
  const { openNotificationSettings, isPushEnabled } = usePushPermission();
  const {
    notificationsData,
    unreadCount,
    isPending,
    isError,
    isFetchNextPageError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetNotifications();
  const { postNotificationsReadMutation, isPostNotificationsReadPending } =
    usePostNotificationsRead();
  const [isMarkAllReadDialogOpen, setIsMarkAllReadDialogOpen] = useState(false);
  const isEmpty = !isPending && notificationsData.length === 0;

  const handleMarkAllRead = () => setIsMarkAllReadDialogOpen(true);

  const bottomRef = useIntersectionObserver(
    fetchNextPage,
    !!hasNextPage && !isFetchingNextPage && !isFetchNextPageError
  );

  const handleNotificationClick = (notification: (typeof notificationsData)[number]) => {
    if (isPostNotificationsReadPending) return;
    const route = getNotificationRoute(notification.type, notification.refId, {
      kind: notification.kind,
      tournamentId: notification.tournamentId,
      tournamentItemId: notification.tournamentItemId,
      wishId: notification.wishId,
    });
    postNotificationsReadMutation({ ids: [notification.id] });
    if (route) router.push(route);
  };

  return (
    <>
      {renderContent()}

      <MarkAllReadDialog open={isMarkAllReadDialogOpen} onOpenChange={setIsMarkAllReadDialogOpen} />
    </>
  );

  function renderContent() {
    if (isError && !isFetchNextPageError)
      return <NotificationStateCard variant="error" onAction={() => refetch()} />;
    if (isEmpty)
      return <NotificationStateCard variant="empty" onAction={openNotificationSettings} />;

    const isPushBannerVisible = isWebview() && isPushEnabled === false;

    return (
      <div className={cn('flex flex-col gap-4 pb-9')}>
        {isPushBannerVisible && (
          <div className="pt-5">
            <PushDisabledBanner onOpenNotificationSettings={openNotificationSettings} />
          </div>
        )}

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPostNotificationsReadPending}
            className="flex w-full cursor-pointer items-center justify-end gap-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircledIconOutline className="size-5 text-icon-neutral-secondary" aria-hidden />
            <span className="body-2-semibold text-text-neutral-secondary">모두 읽음</span>
          </button>
        )}

        <div className="rounded-xl bg-base-50">
          <ul className="divide-y divide-gray-100 px-5">
            {notificationsData.map(notification => (
              <NotificationItem
                key={notification.id}
                kind={notification.kind}
                message={notification.title}
                body={notification.body}
                time={formatTimeKo(notification.createdAt)}
                isRead={notification.isRead}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </ul>
        </div>
        {isFetchNextPageError ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="body-2-medium text-text-neutral-tertiary">알림을 더 불러오지 못했어요</p>
            <Button variant="secondary" size="sm" onClick={() => fetchNextPage()}>
              다시 시도
            </Button>
          </div>
        ) : (
          <div ref={bottomRef} />
        )}

        {!isPending && !isFetchingNextPage && !isFetchNextPageError && !hasNextPage && (
          <p className="mt-3 text-center caption-1-regular text-text-neutral-tertiary">
            알림은 14일간 보관되며, 14일 후 자동 삭제돼요.
          </p>
        )}
      </div>
    );
  }
}

export default NotificationContent;
