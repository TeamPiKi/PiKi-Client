/** `href` 에서 `paramKey` 를 제거한 다음 URL(경로부터). 제거할 것이 없으면 `null`. */

export const removeQueryParam = (href: string, paramKey: string): string | null => {
  const url = new URL(href);
  if (!url.searchParams.has(paramKey)) return null;

  url.searchParams.delete(paramKey);

  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * `router.replace` 를 쓰지 않는 이유 — 여러 effect 가 함께 정리하면 각자 자기 렌더 시점의
 * `searchParams` 스냅샷으로 계산해 남이 지운 키를 되살린다. History API 는 실행 시점의
 * 현재 URL 을 읽어 그 문제가 없고, App Router 가 이를 감지해 관련 훅도 동기화한다.
 */
export const clearQueryParam = (paramKey: string) => {
  const nextUrl = removeQueryParam(window.location.href, paramKey);
  if (nextUrl === null) return;

  window.history.replaceState(null, '', nextUrl);
};
