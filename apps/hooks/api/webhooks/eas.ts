import { escapeMarkdown, sendDiscordMessage } from '../../lib/discord.js';
import { getEasBuildInfo } from '../../lib/eas.js';
import type { ReleaseUpdateT } from '../../lib/release.js';
import { PROFILE_LABEL, buildTag, updateReleaseThread } from '../../lib/release.js';
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

/** EAS Submit 웹훅 (eas webhook:create --event SUBMIT) — 배포 스레드에 제출 결과를 기록 */
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
  const profile = buildInfo?.buildProfile ?? '';
  const label = PROFILE_LABEL[profile] ?? '제출';
  const versionText = buildInfo?.appVersion
    ? ` v${buildInfo.appVersion}${buildInfo.appBuildVersion ? ` (${buildInfo.appBuildVersion})` : ''}`
    : '';

  const tag = buildTag(buildInfo?.appBuildVersion);

  const logLines: string[] = [];
  let lineValue: string;
  if (payload.status === 'finished') {
    lineValue =
      profile === 'production' ? `${tag}심사 제출 완료` : `${tag}TestFlight 업로드 완료 — 처리 대기`;
    logLines.push(
      profile === 'production'
        ? `✅ ${label}${versionText} 심사 제출 완료`
        : `✅ ${label}${versionText} TestFlight 업로드 완료`
    );
  } else {
    lineValue = `${tag}제출 실패`;
    logLines.push(`❌ ${label}${versionText} 스토어 제출 실패`);
    const errorMessage = payload.submissionInfo?.error?.message;
    if (errorMessage) logLines.push(`• 원인: ${escapeMarkdown(errorMessage)}`);
  }
  if (payload.submissionDetailsPageUrl) {
    logLines.push(`• [제출 상세](<${payload.submissionDetailsPageUrl}>)`);
  }
  if (payload.status === 'errored' && payload.submissionInfo?.logsUrl) {
    logLines.push(`• [제출 로그](<${payload.submissionInfo.logsUrl}>)`);
  }
  const log = logLines.join('\n');

  try {
    if (payload.platform === 'ios') {
      const update: ReleaseUpdateT = { log, version: buildInfo?.appVersion ?? null };
      /** 프로필을 모르면(EXPO_TOKEN 없음 등) 상태판 줄은 건드리지 않고 로그만 남긴다 */
      if (PROFILE_LABEL[profile]) update.line = { key: label, value: lineValue };
      await updateReleaseThread(update);
    } else {
      /** Android 는 스레드 사이클 밖 — 단건 알림으로 전송 */
      await sendDiscordMessage(`[AND] PiKi ${log}`);
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'discord update failed' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
