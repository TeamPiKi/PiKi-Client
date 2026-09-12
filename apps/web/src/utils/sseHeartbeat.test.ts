import { describe, expect, it } from 'vitest';

import { SSE_HEARTBEAT_STALE_MS, decideHeartbeatTick } from './sseHeartbeat';

const NOW = 1_000_000;

describe('decideHeartbeatTick', () => {
  it('백그라운드면 연결 중이어도 아무것도 보내지 않는다', () => {
    expect(
      decideHeartbeatTick({ isVisible: false, connectionId: 'c1', lastHeartbeatAt: NOW, now: NOW })
    ).toBe('SKIP');
  });

  it('연결 번호가 없으면(연결 전·재연결 중) 보내지 않는다', () => {
    expect(
      decideHeartbeatTick({ isVisible: true, connectionId: null, lastHeartbeatAt: 0, now: NOW })
    ).toBe('SKIP');
  });

  it('서버 heartbeat 가 60초 이상 안 오면 재연결한다', () => {
    expect(
      decideHeartbeatTick({
        isVisible: true,
        connectionId: 'c1',
        lastHeartbeatAt: NOW - SSE_HEARTBEAT_STALE_MS,
        now: NOW,
      })
    ).toBe('RECONNECT');
  });

  it('60초 직전까지는 결측으로 보지 않고 하트비트를 보낸다', () => {
    expect(
      decideHeartbeatTick({
        isVisible: true,
        connectionId: 'c1',
        lastHeartbeatAt: NOW - SSE_HEARTBEAT_STALE_MS + 1,
        now: NOW,
      })
    ).toBe('SEND');
  });

  it('포그라운드·연결 중·최근 heartbeat 수신이면 하트비트를 보낸다', () => {
    expect(
      decideHeartbeatTick({
        isVisible: true,
        connectionId: 'c1',
        lastHeartbeatAt: NOW - 10_000,
        now: NOW,
      })
    ).toBe('SEND');
  });
});
