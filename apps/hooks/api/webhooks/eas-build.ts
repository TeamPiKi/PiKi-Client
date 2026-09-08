import { escapeMarkdown } from '../../lib/discord.js';
import {
  PLATFORM_LABEL,
  PROFILE_LABEL,
  buildTag,
  lineKey,
  updateReleaseThread,
} from '../../lib/release.js';
import { verifySignature } from '../../lib/verify.js';

type EasBuildPayloadT = {
  platform?: 'ios' | 'android';
  status?: 'finished' | 'errored' | 'canceled';
  buildDetailsPageUrl?: string;
  artifacts?: { buildUrl?: string | null } | null;
  metadata?: {
    appVersion?: string | null;
    appBuildVersion?: string | null;
    buildProfile?: string | null;
  } | null;
  error?: { message?: string; errorCode?: string } | null;
};

/** EAS Build 웹훅 (eas webhook:create --event BUILD) — 빌드 완료가 배포 사이클(스레드)을 연다 */
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

  let payload: EasBuildPayloadT;
  try {
    payload = JSON.parse(rawBody) as EasBuildPayloadT;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  /** 스토어 파이프라인 외(개발 빌드·취소)는 스레드 대상이 아니다 */
  const platform = payload.platform ?? '';
  const profile = payload.metadata?.buildProfile ?? '';
  if (!PLATFORM_LABEL[platform] || !PROFILE_LABEL[profile] || payload.status === 'canceled') {
    return Response.json({ ok: true, skipped: `${platform}:${profile}:${payload.status}` });
  }

  const label = `${PLATFORM_LABEL[platform]} ${PROFILE_LABEL[profile]}`;
  const version = payload.metadata?.appVersion ?? null;
  const versionText = version
    ? ` v${version}${payload.metadata?.appBuildVersion ? ` (${payload.metadata.appBuildVersion})` : ''}`
    : '';

  const tag = buildTag(payload.metadata?.appBuildVersion);

  const logLines: string[] = [];
  let lineValue: string;
  const mentionUserIds: string[] = [];
  if (payload.status === 'finished') {
    lineValue = tag ? `${tag}완료` : '빌드 완료';
    logLines.push(`🛠 ${label}${versionText} 빌드 완료`);

    /** Android 는 Play 제출이 수동이라 빌드 완료가 곧 담당자 호출 시점이다 */
    if (platform === 'android') {
      const submitterId = process.env.DISCORD_PLAY_SUBMITTER_ID;
      if (submitterId) {
        mentionUserIds.push(submitterId);
        logLines[0] += ` — <@${submitterId}> Play 제출 필요`;
      }
      lineValue = `${lineValue} — Play 제출 대기`;
    }
  } else {
    lineValue = tag ? `${tag}실패` : '빌드 실패';
    logLines.push(`❌ ${label}${versionText} 빌드 실패`);
    if (payload.error?.message) logLines.push(`• 원인: ${escapeMarkdown(payload.error.message)}`);
  }

  /** aab/ipa 직접 다운로드 — Play 제출은 파일을 사람이 올려야 해서 Android 만 붙인다 */
  const artifactUrl = payload.artifacts?.buildUrl;
  const links: string[] = [];
  if (platform === 'android' && payload.status === 'finished' && artifactUrl) {
    links.push(`[aab 다운로드](<${artifactUrl}>)`);
  }
  if (payload.buildDetailsPageUrl) links.push(`[빌드 상세](<${payload.buildDetailsPageUrl}>)`);
  if (links.length) logLines.push(`• ${links.join(' · ')}`);

  try {
    await updateReleaseThread({
      log: logLines.join('\n'),
      lines: [{ key: lineKey(platform, profile), value: lineValue }],
      version,
      mentionUserIds,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'discord update failed' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
