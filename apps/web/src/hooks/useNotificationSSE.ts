import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ERROR_CODE, WEBBRIDGE_MESSAGE_TYPE } from '@piki/core';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { postNotificationHeartbeat } from '@/apis/postNotificationHeartbeat';
import { ENDPOINTS } from '@/consts/api';
import { QUERY_KEYS } from '@/consts/queryKeys';
import { ROUTES } from '@/consts/route';
import { CLIENT_TYPE } from '@/consts/webBridge';
import { usePostNotificationsRead } from '@/hooks/usePostNotificationsRead';
import type { NotificationSsePayloadT, SilentSyncSsePayloadT } from '@/types/notification';
import { getApiErrorCode, getApiErrorStatus } from '@/utils/apiError';
import { getCookie } from '@/utils/cookie';
import { handleSessionExpired } from '@/utils/handleSessionExpired';
import { refreshClientToken } from '@/utils/refreshClientToken';
import { SSE_HEARTBEAT_INTERVAL_MS, decideHeartbeatTick } from '@/utils/sseHeartbeat';
import { WebBridge, isWebview } from '@/utils/webBridge';

const MAX_RETRY_DELAY_MS = 30_000;

const INITIAL_RETRY_DELAY_MS = 1_000;

const MAX_AUTH_RETRY_COUNT = 2;

// wishId가 없거나 숫자가 아닌 경우에는 열린 상세가 낡지 않도록 모든 위시 상세 쿼리를 무효화한다
const invalidateWishQueries = (queryClient: QueryClient, wishId?: number) => {
  queryClient.invalidateQueries({ queryKey: ['wishlists'] });

  const isValidWishId = typeof wishId === 'number' && Number.isInteger(wishId) && wishId > 0;
  queryClient.invalidateQueries({ queryKey: isValidWishId ? ['wish', wishId] : ['wish'] });
};

const buildToastMessage = (payload: NotificationSsePayloadT) =>
  payload.body ? `${payload.title} ${payload.body}` : payload.title;

export const useNotificationSSE = (enabled: boolean) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { postNotificationsReadMutation } = usePostNotificationsRead();
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);
  const abortRef = useRef<AbortController | null>(null);
  const hasConnectedRef = useRef(false);
  const authFailCountRef = useRef(0);
  // connect에서 받은 ID. 하트비트에 포함하며 재연결 시 갱신한다
  const connectionIdRef = useRef<string | null>(null);
  // 60초간 이벤트가 없으면 끊긴 스트림으로 보고 재연결한다
  const lastHeartbeatAtRef = useRef(0);

  // 주최자 알림 토스트를 담기 화면에서만 노출하기 위해 최신 경로를 ref로 관리
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isHeartbeatInFlight = false;
    // ref 는 언마운트/재로그인 후에도 남으므로, 이전 세션의 실패 횟수를 물려받지 않도록 초기화
    authFailCountRef.current = 0;
    connectionIdRef.current = null;

    const scheduleReconnect = (delay: number) => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const jitteredDelay = delay * (0.5 + Math.random() * 0.5);
      reconnectTimer = setTimeout(connect, jitteredDelay);
    };

    // heartbeat 결측·409 등 연결 종료가 확정되면 백오프 없이 즉시 재연결한다
    const reconnectNow = () => {
      retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
      connect();
    };

    const tick = () => {
      if (cancelled) return;

      const connectionId = connectionIdRef.current;
      const decision = decideHeartbeatTick({
        isVisible: !document.hidden,
        connectionId,
        lastHeartbeatAt: lastHeartbeatAtRef.current,
        now: Date.now(),
      });

      if (decision === 'SKIP' || !connectionId) return;
      if (decision === 'RECONNECT') {
        reconnectNow();
        return;
      }
      if (isHeartbeatInFlight) return;

      isHeartbeatInFlight = true;
      postNotificationHeartbeat(connectionId)
        .catch(error => {
          if (cancelled) return;
          // 서버에 그 번호의 연결이 없음(배포로 서버가 바뀌었거나 이미 정리됨) → 즉시 재연결
          const isConnectionGone =
            getApiErrorStatus(error) === 409 &&
            getApiErrorCode(error) === ERROR_CODE.NOTIFICATION_CONNECTION_NOT_FOUND;
          // 응답 지연 중 이미 재연결됐으면 옛 번호의 409 로 새 연결을 끊지 않는다
          if (isConnectionGone && connectionIdRef.current === connectionId) reconnectNow();
        })
        .finally(() => {
          isHeartbeatInFlight = false;
        });
    };

    const connect = () => {
      if (cancelled) return;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      // 기존 연결 정리 — 중복 알림 방지
      abortRef.current?.abort();
      // 다음 connect 이벤트 전까지 이전 연결 ID로 하트비트를 보내지 않는다
      connectionIdRef.current = null;

      const controller = new AbortController();
      abortRef.current = controller;

      const accessToken = getCookie('access_token');
      const isApp = isWebview();

      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        'X-Client-Type': isApp ? CLIENT_TYPE.APP : CLIENT_TYPE.WEB,
      };

      if (isApp && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // 웹: Route Handler 경유 (Next.js rewrite 버퍼링 우회, 서버사이드에서 auth 처리)
      // 앱: 기존 rewrite 경로 사용 (Authorization 헤더로 직접 인증)
      const url = isApp ? ENDPOINTS.NOTIFICATIONS_SUBSCRIBE : '/api/notifications/subscribe';

      fetchEventSource(url, {
        headers,
        credentials: 'include',
        signal: controller.signal,
        // 가시성 변화에 따른 라이브러리의 자동 연결 관리는 끄고, 아래 핸들러에서 백오프를 리셋해 직접 재연결한다
        openWhenHidden: true,

        onopen: async response => {
          if (response.ok) {
            retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
            authFailCountRef.current = 0;
            // 연결 직후 첫 heartbeat 까지 60초 유예
            lastHeartbeatAtRef.current = Date.now();
            if (hasConnectedRef.current) {
              // 재연결 성공 — 끊긴 동안 SSE 이벤트로 놓쳤을 수 있는 도메인만 재조회
              void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATION.LIST });
              void queryClient.invalidateQueries({ queryKey: ['tournament'] });
              void queryClient.invalidateQueries({ queryKey: ['wishlists'] });
            }
            hasConnectedRef.current = true;
            return;
          }
          if (response.status === 401) {
            /** 새 토큰으로도 401 이 이어지면 SSE 연결 중단 */
            authFailCountRef.current += 1;
            if (authFailCountRef.current > MAX_AUTH_RETRY_COUNT) {
              cancelled = true;
              throw new Error('unauthorized');
            }
            // 토큰 만료 시 공유 갱신 경로를 사용해 동시 갱신 요청을 막는다
            try {
              await refreshClientToken();
              // refresh 성공 → onerror backoff 로 재연결
              throw new Error('token-refreshed');
            } catch (err) {
              if (err instanceof Error && err.message === 'token-refreshed') throw err;
              // refresh 실패 (만료 등) → 연결 중단 + 전역과 동일한 세션 만료 처리
              cancelled = true;
              handleSessionExpired();
              throw new Error('unauthorized');
            }
          }
          throw new Error(`SSE open failed: ${response.status}`);
        },

        onmessage: event => {
          // 어떤 이벤트든 도착했다는 것은 스트림이 살아 있다는 뜻 — heartbeat 만 세면 알림이 잦을 때 오판한다
          lastHeartbeatAtRef.current = Date.now();

          if (event.event === 'connect') {
            connectionIdRef.current = event.data || null;
            return;
          }

          if (event.event === 'heartbeat') return;

          if (event.event === 'silent-sync') {
            try {
              const payload = JSON.parse(event.data) as SilentSyncSsePayloadT;
              switch (payload.type) {
                case 'TOURNAMENT_ITEM_PARSED':
                  queryClient.invalidateQueries({ queryKey: ['tournament', payload.tournamentId] });
                  break;
                case 'UNREAD_COUNT_CHANGED':
                  void queryClient.refetchQueries({
                    queryKey: QUERY_KEYS.NOTIFICATION.LIST,
                    type: 'all',
                  });
                  if (isWebview()) {
                    WebBridge.postMessage({
                      type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_SET_BADGE,
                      payload: { count: payload.unreadCount },
                    });
                  }
                  break;
              }
            } catch {
              // malformed JSON — 무시
            }
            return;
          }

          if (event.event === 'notification') {
            try {
              const payload = JSON.parse(event.data) as NotificationSsePayloadT;
              // 배지 갱신은 silent-sync(UNREAD_COUNT_CHANGED) 가 payload 의 count 로 처리한다 — 별도 조회 금지
              void queryClient.refetchQueries({
                queryKey: QUERY_KEYS.NOTIFICATION.LIST,
                type: 'all',
              });
              const message = buildToastMessage(payload);

              const showNotificationToastAndMarkRead = (variant: 'success' | 'info' | 'error') => {
                if (variant === 'success') toast.success(message);
                else toast[variant](message, { duration: 5000 });
                postNotificationsReadMutation({ ids: [payload.id] });
              };

              switch (payload.type) {
                case 'ITEM_REFRESH_COMPLETED':
                case 'ITEM_PARSING_COMPLETED':
                  if (payload.kind === 'TOURNAMENT' && payload.tournamentId != null) {
                    queryClient.invalidateQueries({
                      queryKey: ['tournament', payload.tournamentId],
                    });
                  } else if (payload.kind === 'WISH') {
                    invalidateWishQueries(queryClient, payload.wishId);
                  }
                  showNotificationToastAndMarkRead('success');
                  break;
                /** 미완성·실패 모두 동일한 데이터를 갱신하고, 사용자 안내만 다르다. */
                case 'ITEM_PARSING_INCOMPLETE':
                case 'ITEM_PARSING_FAILED':
                  if (payload.kind === 'TOURNAMENT' && payload.tournamentId != null) {
                    queryClient.invalidateQueries({
                      queryKey: ['tournament', payload.tournamentId],
                    });
                  } else if (payload.kind === 'WISH') {
                    invalidateWishQueries(queryClient, payload.wishId);
                  }
                  showNotificationToastAndMarkRead(
                    payload.type === 'ITEM_PARSING_INCOMPLETE' ? 'info' : 'error'
                  );
                  break;
                case 'TOURNAMENT_STARTED':
                  queryClient.invalidateQueries({ queryKey: ['tournament', payload.refId] });
                  showNotificationToastAndMarkRead('info');
                  break;
                case 'TOURNAMENT_JOINED':
                case 'TOURNAMENT_ITEM_ADDED':
                case 'TOURNAMENT_ITEM_DELETED':
                  queryClient.invalidateQueries({ queryKey: ['tournament', payload.refId] });

                  if (pathnameRef.current === ROUTES.TOURNAMENT_CREATE(payload.refId)) {
                    showNotificationToastAndMarkRead('info');
                  }
                  break;
                default:
                  showNotificationToastAndMarkRead('info');
              }
            } catch {
              // malformed JSON — 무시
            }
          }
        },

        // 서버가 스트림을 정상 종료한 경우는 onerror를 호출하지 않으므로 직접 재연결한다
        onclose: () => {
          if (cancelled) return;

          retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
          scheduleReconnect(INITIAL_RETRY_DELAY_MS);
        },

        onerror: err => {
          if (cancelled) throw err; // fetchEventSource 재시도 중단

          const delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);

          // throw하면 fetchEventSource가 재시도 멈춤 → setTimeout으로 수동 재연결
          controller.abort();
          scheduleReconnect(delay);
          throw err;
        },
      }).catch(() => {
        // onopen/onerror 에서 throw 하면 반환 Promise 가 reject 된다 — 처리는 위에서 끝났으므로 흡수만
      });
    };

    // 화면 복귀 시 예약된 재연결은 즉시 실행하고, 없으면 하트비트로 백그라운드 중 정리된 연결(409)을 빠르게 감지한다.
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      if (reconnectTimer) {
        reconnectNow();
        return;
      }

      tick();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    connect();
    const heartbeatTimer = setInterval(tick, SSE_HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      abortRef.current?.abort();
      connectionIdRef.current = null;
    };
  }, [enabled, queryClient, postNotificationsReadMutation]);
};
