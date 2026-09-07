import { fetch as expoFetch } from 'expo/fetch';

import type { ShareItemStatusT } from './postWishLinkFromShare';

/**
 * SSE 구독 결과. `FALLBACK` 은 타임아웃·연결 실패·abort 등 —
 * 저장은 이미 성공한 상태라 호출부는 기존 성공 화면으로 조용히 폴백한다.
 */
export type ItemParsingSseResultT =
  | Extract<ShareItemStatusT, 'READY' | 'INCOMPLETE' | 'FAILED'>
  | 'FALLBACK';

/** 시트가 로딩에 고착되지 않도록 이벤트가 없으면 성공 화면으로 폴백 */
const SSE_TIMEOUT_MS = 10_000;

const PARSING_EVENT_TO_RESULT: Record<string, ItemParsingSseResultT> = {
  ITEM_PARSING_COMPLETED: 'READY',
  ITEM_PARSING_INCOMPLETE: 'INCOMPLETE',
  ITEM_PARSING_FAILED: 'FAILED',
};

type NotificationSsePayloadT = {
  type?: string;
  kind?: string;
  refId?: number;
};

const NEW_LINE = 0x0a;
const CARRIAGE_RETURN = 0x0d;

/**
 * NOTE: Share Extension 번들에는 expo winter 폴리필(TextDecoder)이 로드된다는 보장이 없어
 * 직접 디코딩한다. 프레임 경계(ASCII \n)는 UTF-8 연속 바이트와 겹치지 않아
 * 완결된 프레임 단위로만 디코딩하면 멀티바이트 문자가 청크에 걸쳐 잘릴 일이 없다.
 */
const decodeUtf8 = (bytes: Uint8Array): string => {
  let result = '';
  let index = 0;

  while (index < bytes.length) {
    const first = bytes[index];
    let codePoint = first;
    let extraBytes = 0;

    if (first >= 0xf0) extraBytes = 3;
    else if (first >= 0xe0) extraBytes = 2;
    else if (first >= 0xc0) extraBytes = 1;

    if (extraBytes > 0) {
      codePoint = first & (0x3f >> extraBytes);
      for (let offset = 1; offset <= extraBytes; offset += 1) {
        codePoint = (codePoint << 6) | (bytes[index + offset] & 0x3f);
      }
    }

    result += String.fromCodePoint(codePoint);
    index += 1 + extraBytes;
  }

  return result;
};

/** SSE 프레임(빈 줄 전까지)에서 event 이름과 data 를 뽑는다 */
const parseSseFrame = (frame: string): { event: string; data: string } => {
  let event = 'message';
  const dataLines: string[] = [];

  for (const rawLine of frame.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (line.startsWith('event:')) event = line.slice(6).trimStart();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }

  return { event, data: dataLines.join('\n') };
};

/** 버퍼에서 완결된 프레임들을 잘라내고 남은 바이트를 돌려준다 */
const extractFrames = (buffer: Uint8Array): { frames: string[]; rest: Uint8Array } => {
  const frames: string[] = [];
  let start = 0;

  for (let i = 0; i < buffer.length - 1; i += 1) {
    if (buffer[i] !== NEW_LINE) continue;

    /** \n\n 또는 \n\r\n 을 프레임 경계로 본다 */
    const isBoundary =
      buffer[i + 1] === NEW_LINE ||
      (buffer[i + 1] === CARRIAGE_RETURN && buffer[i + 2] === NEW_LINE);

    if (!isBoundary) continue;

    frames.push(decodeUtf8(buffer.subarray(start, i)));
    start = i + (buffer[i + 1] === NEW_LINE ? 2 : 3);
    i = start - 1;
  }

  return { frames, rest: buffer.subarray(start) };
};

const concatBytes = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
};

type SubscribeItemParsingParamsT = {
  /** 이 아이템의 ITEM_PARSING_* 알림만 소비한다 (refId === itemId) */
  itemId: number;
  /** postWishLinkFromShare 가 refresh 까지 끝낸 시점의 토큰 */
  accessToken: string;
  /** 시트 close·호스트 앱 이동 시 연결을 즉시 끊기 위한 신호 */
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * 알림 SSE 를 구독해 위시 아이템 파싱 결과를 기다린다.
 * SSE 는 보조 채널 — 어떤 오류(연결 실패·401·타임아웃·abort)든 throw 없이 FALLBACK 을 반환한다.
 */
export const subscribeItemParsingFromShare = async ({
  itemId,
  accessToken,
  signal,
  timeoutMs = SSE_TIMEOUT_MS,
}: SubscribeItemParsingParamsT): Promise<ItemParsingSseResultT> => {
  const controller = new AbortController();
  const abortConnection = () => controller.abort();

  const timeoutId = setTimeout(abortConnection, timeoutMs);
  signal?.addEventListener('abort', abortConnection, { once: true });

  try {
    const response = await expoFetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/v1/notifications/subscribe`,
      {
        headers: {
          Accept: 'text/event-stream',
          'X-Client-Type': 'app',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      }
    );

    if (!response.ok || !response.body) return 'FALLBACK';

    const reader = response.body.getReader();
    let buffer: Uint8Array = new Uint8Array(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) return 'FALLBACK';

      buffer = concatBytes(buffer, value);
      const { frames, rest } = extractFrames(buffer);
      buffer = rest;

      for (const frame of frames) {
        const { event, data } = parseSseFrame(frame);
        if (event !== 'notification') continue;

        try {
          const payload = JSON.parse(data) as NotificationSsePayloadT;
          const result = payload.type ? PARSING_EVENT_TO_RESULT[payload.type] : null;

          if (result && payload.kind === 'WISH' && payload.refId === itemId) return result;
        } catch {
          /** malformed JSON — 다음 이벤트를 기다린다 */
        }
      }
    }
  } catch {
    /** 연결 실패·타임아웃·abort — 저장 성공은 이미 확정이라 조용히 폴백 */
    return 'FALLBACK';
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortConnection);
    /** 이벤트 수신으로 조기 종료해도 연결을 확실히 닫는다 */
    controller.abort();
  }
};
