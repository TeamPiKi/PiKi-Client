export type EasBuildInfoT = {
  buildProfile?: string | null;
  appVersion?: string | null;
  appBuildVersion?: string | null;
};

/** EAS GraphQL로 빌드 프로필·버전 조회 — 토큰 없음·조회 실패 시 null (알림 자체는 계속) */
export const getEasBuildInfo = async (buildId: string): Promise<EasBuildInfoT | null> => {
  const token = process.env.EXPO_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch('https://api.expo.dev/graphql', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query:
          'query Build($buildId: ID!) { builds { byId(buildId: $buildId) { buildProfile appVersion appBuildVersion } } }',
        variables: { buildId },
      }),
    });
    if (!response.ok) return null;

    const result = (await response.json()) as {
      data?: { builds?: { byId?: EasBuildInfoT | null } };
    };
    return result.data?.builds?.byId ?? null;
  } catch (error) {
    console.error('EAS 빌드 조회 실패:', error);
    return null;
  }
};
