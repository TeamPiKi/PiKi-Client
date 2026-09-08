import { createSign } from 'node:crypto';

const API_BASE = 'https://api.appstoreconnect.apple.com';
const REQUEST_TIMEOUT_MS = 10_000;
/** PiKi — filter[app] 를 빼면 계정의 다른 앱 빌드가 섞여 나온다 */
const APP_ID = '6777101805';

export type AscBuildT = { buildVersion: string; appVersion: string | null; processingState: string };

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

/** ASC API 용 ES256 JWT — 키 3종 중 하나라도 없으면 null (조회를 건너뛴다) */
const createToken = () => {
  const issuerId = process.env.ASC_API_ISSUER_ID;
  const keyId = process.env.ASC_API_KEY_ID;
  const privateKeyB64 = process.env.ASC_API_PRIVATE_KEY_B64;
  if (!issuerId || !keyId || !privateKeyB64) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })
  );

  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  /** JWT 는 DER 이 아니라 r||s raw 서명을 요구한다 */
  const signature = signer.sign({
    key: Buffer.from(privateKeyB64, 'base64'),
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${payload}.${b64url(signature)}`;
};

type BuildsResponseT = {
  data?: {
    attributes?: { version?: string | null; processingState?: string | null };
    relationships?: { preReleaseVersion?: { data?: { id?: string } | null } };
  }[];
  included?: { id?: string; attributes?: { version?: string | null; platform?: string | null } }[];
};

/** iOS 빌드 목록 (최신 업로드순) — 키 없음·조회 실패 시 null */
export const listAscIosBuilds = async (limit = 10): Promise<AscBuildT[] | null> => {
  const token = createToken();
  if (!token) return null;

  const query = new URLSearchParams({
    'filter[app]': APP_ID,
    include: 'preReleaseVersion',
    sort: '-uploadedDate',
    limit: String(limit),
  });

  try {
    const response = await fetch(`${API_BASE}/v1/builds?${query}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.error(`ASC 빌드 조회 실패 (HTTP ${response.status}) ${await response.text()}`);
      return null;
    }

    const result = (await response.json()) as BuildsResponseT;
    const preRelease = new Map(
      (result.included ?? []).filter(item => item.id).map(item => [item.id, item.attributes ?? {}])
    );

    /** 플랫폼 필터는 서버에 걸지 않고 여기서 가린다 — 필터 키가 바뀌면 400 으로 조회 전체가 죽는다 */
    return (result.data ?? []).flatMap(build => {
      const version = build.attributes?.version;
      if (!version) return [];
      const pre = preRelease.get(build.relationships?.preReleaseVersion?.data?.id);
      if (pre?.platform !== 'IOS') return [];
      return [
        {
          buildVersion: version,
          appVersion: pre?.version ?? null,
          processingState: build.attributes?.processingState ?? '',
        },
      ];
    });
  } catch (error) {
    console.error('ASC 빌드 조회 실패:', error);
    return null;
  }
};

/** TestFlight 처리가 끝난(VALID) iOS 빌드 번호 집합 — 조회 불가 시 null */
export const listValidIosBuildNumbers = async () => {
  const builds = await listAscIosBuilds();
  if (!builds) return null;
  return new Set(builds.filter(b => b.processingState === 'VALID').map(b => b.buildVersion));
};
