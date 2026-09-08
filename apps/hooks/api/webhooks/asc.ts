import { listValidIosBuildNumbers } from '../../lib/asc.js';
import type { ReleaseLineT, ReleaseUpdateT, RootStateT } from '../../lib/release.js';
import { PROFILE_LABEL, buildOfLine, lineKey, parseLines, updateReleaseThread } from '../../lib/release.js';
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

const REVIEW_KEY = 'iOS 심사';
const READY_TEXT = 'TestFlight 준비 완료';
const SUBMIT_WAIT = ' — 심사 제출 대기';

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

const IOS_PROFILE_KEYS = Object.keys(PROFILE_LABEL).map(profile => lineKey('ios', profile));
const REVIEW_PROFILE_KEY = lineKey('ios', 'production');

/** ASC 이벤트에는 빌드 식별 정보가 없어, VALID 가 된 빌드 번호로 상태판 줄을 되짚는다 */
const readyLines = (root: RootStateT, validBuilds: Set<string>) =>
  parseLines(root).flatMap(line => {
    if (!IOS_PROFILE_KEYS.includes(line.key)) return [];
    if (line.value.includes(READY_TEXT)) return [];
    const build = buildOfLine(line.value);
    if (!build || !validBuilds.has(build)) return [];
    return [{ key: line.key, build }];
  });

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

  /** buildUploads id 로 단건 조회가 가능한지 판단하려면 실물 페이로드가 필요하다 (#625) */
  console.warn(`ASC 웹훅 수신 ${eventType}:${newState} ${rawBody}`);

  let update: ReleaseUpdateT | null = null;
  if (eventType === 'buildUploadStateUpdated') {
    if (newState === 'COMPLETE') {
      const validBuilds = await listValidIosBuildNumbers();
      /** 조회 불가(키 없음·장애)면 어느 빌드인지 특정할 수 없어 중립 문구만 남긴다 */
      if (!validBuilds) {
        update = { log: '✅ TestFlight 처리 완료 — 테스트 배포 가능' };
      } else {
        const submitterId = process.env.DISCORD_APPSTORE_SUBMITTER_ID;
        /** 심사용 빌드가 준비된 순간이 ASC 에서 심사 제출을 누를 시점이다 */
        const isReviewReady = (root: RootStateT) =>
          readyLines(root, validBuilds).some(line => line.key === REVIEW_PROFILE_KEY);

        update = {
          log: root =>
            readyLines(root, validBuilds)
              .map(line => {
                const base = `✅ ${line.key} 빌드 ${line.build} ${READY_TEXT}`;
                /** 멘션 문자열이 본문에 있어야 핑이 울린다 (allowed_mentions 만으로는 안 된다) */
                return line.key === REVIEW_PROFILE_KEY && submitterId
                  ? `${base} — <@${submitterId}> 심사 제출 필요`
                  : base;
              })
              .join('\n'),
          lines: root =>
            readyLines(root, validBuilds).map(
              (line): ReleaseLineT => ({
                key: line.key,
                value:
                  line.key === REVIEW_PROFILE_KEY
                    ? `빌드 ${line.build} ${READY_TEXT}${SUBMIT_WAIT}`
                    : `빌드 ${line.build} ${READY_TEXT}`,
              })
            ),
          mentionUserIds: root => (submitterId && isReviewReady(root) ? [submitterId] : []),
        };
      }
    } else if (newState === 'FAILED') {
      update = { log: '❌ TestFlight 처리 실패' };
    }
  } else if (eventType === 'appStoreVersionAppVersionStateUpdated') {
    const state = VERSION_STATE[newState];
    if (state) {
      update = {
        log: state.log,
        lines: root => {
          const reviewLine = parseLines(root).find(line => line.key === REVIEW_PROFILE_KEY);
          return [
            { key: REVIEW_KEY, value: state.status },
            /** 심사가 돌기 시작했으면 제출 대기 안내는 지난 얘기다 (줄이 있을 때만 손댄다) */
            ...(reviewLine?.value.includes(SUBMIT_WAIT)
              ? [{ key: REVIEW_PROFILE_KEY, value: reviewLine.value.replace(SUBMIT_WAIT, '') }]
              : []),
          ];
        },
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
