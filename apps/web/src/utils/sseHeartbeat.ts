/** 클라이언트 → 서버 하트비트 전송 주기 */
export const SSE_HEARTBEAT_INTERVAL_MS = 30_000;

/** 서버 heartbeat 결측 임계값 — 한 번 밀린 ping 을 끊김으로 오판하지 않도록 두 주기 */
export const SSE_HEARTBEAT_STALE_MS = 60_000;

export type HeartbeatTickInputT = {
  /** 문서가 포그라운드인지 — 백그라운드에선 아무것도 하지 않는다 */
  isVisible: boolean;
  /** `connect` 이벤트로 받은 연결 번호. 없으면 아직 연결 중이 아니다 */
  connectionId: string | null;
  /** 마지막으로 스트림 이벤트를 받은 시각 (ms) */
  lastHeartbeatAt: number;
  now: number;
};

export type HeartbeatTickDecisionT = 'SKIP' | 'RECONNECT' | 'SEND';

export const decideHeartbeatTick = ({
  isVisible,
  connectionId,
  lastHeartbeatAt,
  now,
}: HeartbeatTickInputT): HeartbeatTickDecisionT => {
  if (!isVisible || !connectionId) return 'SKIP';
  if (now - lastHeartbeatAt >= SSE_HEARTBEAT_STALE_MS) return 'RECONNECT';

  return 'SEND';
};
