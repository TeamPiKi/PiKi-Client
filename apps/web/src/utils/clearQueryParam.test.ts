import { describe, expect, it } from 'vitest';

import { removeQueryParam } from './clearQueryParam';

const ORIGIN = 'https://piki.app';

describe('removeQueryParam', () => {
  it('키가 없으면 null 을 반환해 URL 갱신을 건너뛰게 한다', () => {
    expect(removeQueryParam(`${ORIGIN}/tournament/1/create`, 'action')).toBeNull();
    expect(removeQueryParam(`${ORIGIN}/tournament/1/create?other=1`, 'action')).toBeNull();
  });

  it('대상 키만 제거하고 나머지 쿼리는 보존한다', () => {
    expect(
      removeQueryParam(
        `${ORIGIN}/tournament/1/create?action=scroll-to-last&highlightItem=10`,
        'action'
      )
    ).toBe('/tournament/1/create?highlightItem=10');
  });

  it('연속 호출이 합성되어 소비한 키가 되살아나지 않는다', () => {
    const afterFirst = removeQueryParam(
      `${ORIGIN}/tournament/1/create?action=scroll-to-last&highlightItem=10`,
      'action'
    );
    expect(afterFirst).toBe('/tournament/1/create?highlightItem=10');

    const afterSecond = removeQueryParam(`${ORIGIN}${afterFirst}`, 'highlightItem');
    expect(afterSecond).toBe('/tournament/1/create');
  });
});
