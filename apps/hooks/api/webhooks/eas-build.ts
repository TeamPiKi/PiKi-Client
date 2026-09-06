import { escapeMarkdown } from '../../lib/discord.js';
import { PROFILE_LABEL, buildTag, updateReleaseThread } from '../../lib/release.js';
import { verifySignature } from '../../lib/verify.js';

type EasBuildPayloadT = {
  platform?: 'ios' | 'android';
  status?: 'finished' | 'errored' | 'canceled';
  buildDetailsPageUrl?: string;
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

  /** iOS 스토어 파이프라인 외(안드로이드·취소·개발 빌드)는 스레드 대상이 아니다 */
  const profile = payload.metadata?.buildProfile ?? '';
  if (payload.platform !== 'ios' || !PROFILE_LABEL[profile] || payload.status === 'canceled') {
    return Response.json({ ok: true, skipped: `${payload.platform}:${profile}:${payload.status}` });
  }

  const label = PROFILE_LABEL[profile];
  const version = payload.metadata?.appVersion ?? null;
  const versionText = version
    ? ` v${version}${payload.metadata?.appBuildVersion ? ` (${payload.metadata.appBuildVersion})` : ''}`
    : '';

  const tag = buildTag(payload.metadata?.appBuildVersion);

  const logLines: string[] = [];
  let lineValue: string;
  if (payload.status === 'finished') {
    lineValue = tag ? `${tag}완료` : '빌드 완료';
    logLines.push(`🛠 ${label}${versionText} 빌드 완료`);
  } else {
    lineValue = tag ? `${tag}실패` : '빌드 실패';
    logLines.push(`❌ ${label}${versionText} 빌드 실패`);
    if (payload.error?.message) logLines.push(`• 원인: ${escapeMarkdown(payload.error.message)}`);
  }
  if (payload.buildDetailsPageUrl) logLines.push(`• [빌드 상세](<${payload.buildDetailsPageUrl}>)`);

  try {
    await updateReleaseThread({
      log: logLines.join('\n'),
      line: { key: label, value: lineValue },
      version,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'discord update failed' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
