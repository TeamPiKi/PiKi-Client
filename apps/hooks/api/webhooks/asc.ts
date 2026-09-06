import type { RootStateT } from '../../lib/release.js';
import { updateReleaseThread } from '../../lib/release.js';
import { verifySignature } from '../../lib/verify.js';

type AscWebhookPayloadT = {
  data?: {
    type?: string;
    attributes?: {
      newState?: string;
      newValue?: string;
    };
  };
};

type VersionStateT = {
  status: string;
  log: string;
  final?: { emoji: string; text: string };
};

/** 심사 통과·출시·반려만 기록 — 수동/자동 출시는 통과 후 전이로 드러난다 */
const VERSION_STATE: Record<string, VersionStateT> = {
  ACCEPTED: { status: '✅ 통과', log: '✅ 심사 통과' },
  PENDING_DEVELOPER_RELEASE: {
    status: '✅ 통과 — 수동 출시 대기',
    log: '✅ 심사 통과 — 수동 출시 대기',
  },
  PROCESSING_FOR_DISTRIBUTION: { status: '🚚 출시 처리 중', log: '🚚 출시 처리 중 (자동 출시)' },
  READY_FOR_DISTRIBUTION: {
    status: '🎉 출시 완료',
    log: '🎉 출시 완료!',
    final: { emoji: '🎉', text: '출시 완료!' },
  },
  READY_FOR_SALE: {
    status: '🎉 출시 완료',
    log: '🎉 출시 완료!',
    final: { emoji: '🎉', text: '출시 완료!' },
  },
  REJECTED: { status: '❌ 반려', log: '❌ 심사 반려', final: { emoji: '❌', text: '심사 반려' } },
  METADATA_REJECTED: {
    status: '❌ 반려 (메타데이터)',
    log: '❌ 심사 반려 (메타데이터)',
    final: { emoji: '❌', text: '심사 반려' },
  },
};

/** ASC 페이로드에는 빌드 식별 정보가 없어, 상태판에 남은 이 사이클의 빌드 번호로 되짚는다 */
const testFlightBuild = ({ title, lines }: RootStateT) => {
  const version = /v[\d.]+/.exec(title)?.[0] ?? '';
  const builds = [
    ...new Set(lines.flatMap(line => (line.match(/빌드 \d+/g) ?? []).map(tag => tag.slice(3)))),
  ];
  const buildText = builds.length > 1 ? `빌드 ${builds.join('·')} 중 1건` : (builds[0] && `빌드 ${builds[0]}`);
  const detail = [version, buildText].filter(Boolean).join(' ');
  return detail ? ` — ${detail}` : '';
};

/** App Store Connect 웹훅 — TestFlight 빌드 처리·심사 상태 전이를 배포 스레드에 기록 */
export async function POST(request: Request) {
  const secret = process.env.ASC_WEBHOOK_SECRET;
  if (!secret) {
    console.error('ASC_WEBHOOK_SECRET 환경변수가 없습니다');
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-apple-signature'), secret, 'sha256')) {
    return Response.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: AscWebhookPayloadT;
  try {
    payload = JSON.parse(rawBody) as AscWebhookPayloadT;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const eventType = payload.data?.type ?? '';
  const attributes = payload.data?.attributes ?? {};
  /** 이벤트별로 attributes 키가 다르다 (build: newState, version: newValue) */
  const newState = attributes.newState ?? attributes.newValue ?? '';

  let update: Parameters<typeof updateReleaseThread>[0] | null = null;
  if (eventType === 'buildUploadStateUpdated') {
    if (newState === 'COMPLETE') {
      update = {
        log: root => `✅ TestFlight 처리 완료${testFlightBuild(root)} · 테스트 배포 가능`,
        line: { key: 'TestFlight 처리', value: prev => `${(parseInt(prev ?? '', 10) || 0) + 1}건 완료` },
      };
    } else if (newState === 'FAILED') {
      update = { log: root => `❌ TestFlight 처리 실패${testFlightBuild(root)}` };
    }
  } else if (eventType === 'appStoreVersionAppVersionStateUpdated') {
    const state = VERSION_STATE[newState];
    if (state) {
      update = {
        log: state.log,
        line: { key: '심사', value: state.status },
        final: state.final,
      };
    }
  }

  /** ping·미구독 이벤트·매핑 없는 상태는 200 으로 무시 (재시도 유발 금지) */
  if (!update) {
    return Response.json({ ok: true, skipped: `${eventType}:${newState}` });
  }

  try {
    await updateReleaseThread(update);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'discord update failed' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
