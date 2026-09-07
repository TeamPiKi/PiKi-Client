import type { AnalyticsEventParamsT } from '@piki/core';
import { WEBBRIDGE_MESSAGE_TYPE } from '@piki/core';

import type { AnalyticsEventNameT } from '@/consts/analytics';

import { WebBridge, isWebview } from './webBridge';

/**
 * gtag 는 인자를 `dataLayer` 에 밀어넣기만 하는 얇은 함수다.
 * GoogleAnalytics 스크립트가 아직 로드되기 전이어도 배열에 쌓아두면 로드 후 그대로 처리되므로,
 * `window.gtag` 존재 여부를 기다리지 않고 직접 큐에 넣는다. (하이드레이션 직후 유실 방지)
 */
const pushToDataLayer = (...args: unknown[]) => {
  if (typeof window === 'undefined') return;

  const target = window as unknown as { dataLayer?: unknown[] };
  target.dataLayer = target.dataLayer ?? [];
  target.dataLayer.push(args);
};

/**
 * GA4 이벤트 로깅 — 환경별로 분기한다.
 *
 * - 웹뷰(앱) 안: webBridge 로 네이티브에 전달 → `@react-native-firebase/analytics` (모바일 스트림).
 * - 일반 브라우저: `gtag('event', ...)` 호출 → GA4 web 스트림.
 *
 * 두 스트림은 GA4 속성 안에서 통합 집계되어 한 대시보드에서 본다.
 *
 * GA4 정책:
 *  - 이벤트명: 40자 이내 snake_case
 *  - 파라미터: primitive(string/number/boolean) 만 허용
 *  - PII(이메일/닉네임/실명) 금지 — ID 만 보낸다
 *
 * 사용:
 * ```
 * logAnalyticsEvent(ANALYTICS_EVENT.TOURNAMENT_CREATE, { tournament_id: id });
 * ```
 */
export const logAnalyticsEvent = (name: AnalyticsEventNameT, params?: AnalyticsEventParamsT) => {
  if (isWebview()) {
    WebBridge.postMessage({
      type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_LOG_ANALYTICS_EVENT,
      payload: { name, params },
    });
    return;
  }

  pushToDataLayer('event', name, params);
};

/**
 * GA4 사용자 속성 설정 — 이후 모든 이벤트에 자동으로 따라붙는다.
 *
 * 이벤트 파라미터와 달리 한 번 설정하면 그 사용자의 모든 이벤트에 실려서,
 * A/B 그룹별 후속 퍼널(완주율·공유율 등)을 추가 코드 없이 볼 수 있다.
 *
 * 앱(웹뷰)은 아직 브릿지 메시지가 없어 웹 스트림에서만 적용된다.
 */
export const setAnalyticsUserProperties = (params: AnalyticsEventParamsT) => {
  if (isWebview()) return;

  pushToDataLayer('set', 'user_properties', params);
};
