import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import 'expo-router/entry';

import { captureError } from '@/utils/captureError';
import { setAppBadgeCount } from '@/utils/pushNotification';

/** foreground 메인 + background headless 둘 다 여기서 초기화 (쉐어 익스텐션 제외) */
const stage = process.env.EXPO_PUBLIC_STAGE;

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: stage,
  enabled: stage === 'production' || stage === 'staging',
  /** Performance(Tracing)는 초기엔 off */
  tracesSampleRate: 0,
  /** PII 기본 마스킹 (Session Replay 는 web 만, 앱은 에러/크래시만) */
  sendDefaultPii: false,
  /** 메인 스레드가 5초 이상 멈추면 스택을 떠서 다음 실행 때 보고 — 부팅 고착 진단용 (iOS) */
  enableAppHangTracking: true,
  appHangTimeoutInterval: 5,
});

/** 백그라운드 FCM 메시지 핸들러 */
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  try {
    console.warn('[FCM] Background message:', remoteMessage.messageId ?? 'unknown');
    const unreadCount = remoteMessage.data?.unreadCount;
    if (unreadCount !== undefined) {
      await setAppBadgeCount(Number(unreadCount));
    }
  } catch (error) {
    captureError(error, { tags: { source: 'fcm-background' } });
  }
});
