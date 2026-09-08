import { escapeMarkdown } from '../../lib/discord.js';
import { getEasBuildInfo } from '../../lib/eas.js';
import { PLATFORM_LABEL, PROFILE_LABEL, buildTag, lineKey, updateReleaseThread } from '../../lib/release.js';
import { verifySignature } from '../../lib/verify.js';

type EasSubmitPayloadT = {
  platform?: 'ios' | 'android';
  status?: 'finished' | 'errored' | 'canceled';
  turtleBuildId?: string | null;
  submissionDetailsPageUrl?: string;
  submissionInfo?: {
    error?: { message?: string; errorCode?: string };
    logsUrl?: string;
  } | null;
};

/** EAS Submit 웹훅 (eas webhook:create --event SUBMIT) — 배포 스레드에 업로드 결과를 기록 */
export async function POST(request: Request) {
  const secret = process.env.EAS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('EAS_WEBHOOK_SECRET 환경변수가 없습니다');
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('expo-signature'), secret, 'sha1')) {
    return Response.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: EasSubmitPayloadT;
  try {
    payload = JSON.parse(rawBody) as EasSubmitPayloadT;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  if (payload.status !== 'finished' && payload.status !== 'errored') {
    return Response.json({ ok: true, skipped: payload.status ?? 'unknown' });
  }

  const buildInfo = payload.turtleBuildId ? await getEasBuildInfo(payload.turtleBuildId) : null;
  const platform = payload.platform ?? '';
  const profile = buildInfo?.buildProfile ?? '';
  const label = [PLATFORM_LABEL[platform], PROFILE_LABEL[profile]].filter(Boolean).join(' ');

  const versionText = buildInfo?.appVersion
    ? ` v${buildInfo.appVersion}${buildInfo.appBuildVersion ? ` (${buildInfo.appBuildVersion})` : ''}`
    : '';

  const tag = buildTag(buildInfo?.appBuildVersion);
  /** 라벨·버전은 모를 수 있다 (EXPO_TOKEN 없음 등) — 빈 조각은 걸러 공백이 겹치지 않게 한다 */
  const subject = [label, versionText.trim()].filter(Boolean).join(' ');

  const logLines: string[] = [];
  let lineValue: string;
  if (payload.status === 'finished') {
    /** eas submit 은 스토어 업로드까지다 — 심사 제출은 ASC 에서 사람이 따로 눌러야 한다 */
    const doneText = platform === 'ios' ? 'ASC 업로드 완료' : '스토어 업로드 완료';
    lineValue = `${tag}${doneText}`;
    logLines.push(['✅', subject, doneText].filter(Boolean).join(' '));
  } else {
    lineValue = `${tag}업로드 실패`;
    logLines.push(['❌', subject, '스토어 업로드 실패'].filter(Boolean).join(' '));
    const errorMessage = payload.submissionInfo?.error?.message;
    if (errorMessage) logLines.push(`• 원인: ${escapeMarkdown(errorMessage)}`);
  }
  if (payload.submissionDetailsPageUrl) {
    logLines.push(`• [제출 상세](<${payload.submissionDetailsPageUrl}>)`);
  }
  if (payload.status === 'errored' && payload.submissionInfo?.logsUrl) {
    logLines.push(`• [제출 로그](<${payload.submissionInfo.logsUrl}>)`);
  }

  try {
    await updateReleaseThread({
      log: logLines.join('\n'),
      /** 프로필·플랫폼을 모르면(EXPO_TOKEN 없음 등) 상태판 줄은 건드리지 않고 로그만 남긴다 */
      lines:
        PLATFORM_LABEL[platform] && PROFILE_LABEL[profile]
          ? [{ key: lineKey(platform, profile), value: lineValue }]
          : [],
      version: buildInfo?.appVersion ?? null,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'discord update failed' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
