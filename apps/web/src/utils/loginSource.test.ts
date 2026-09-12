import { afterEach, describe, expect, it, vi } from 'vitest';

import { LOGIN_SOURCE, LOGIN_SOURCE_KEY } from '@/consts/loginSource';

import { consumeLoginSource, setLoginSource } from './loginSource';

/** node 환경이라 sessionStorage 가 없다 — 저장소를 직접 세워 실제 읽기·쓰기 경로를 태운다 */
const stubSessionStorage = () => {
  const store = new Map<string, string>();

  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });

  return store;
};

/** private mode 등 접근 자체가 throw 하는 환경 */
const stubThrowingSessionStorage = () => {
  const throwAccess = () => {
    throw new Error('sessionStorage 접근 차단');
  };

  vi.stubGlobal('window', {
    sessionStorage: { getItem: throwAccess, setItem: throwAccess, removeItem: throwAccess },
  });
};

afterEach(() => vi.unstubAllGlobals());

describe('setLoginSource', () => {
  it('유입 지점을 저장한다', () => {
    const store = stubSessionStorage();

    setLoginSource(LOGIN_SOURCE.MYPAGE);

    expect(store.get(LOGIN_SOURCE_KEY)).toBe('mypage');
  });

  it('마지막 유입 지점만 남도록 덮어쓴다', () => {
    stubSessionStorage();

    setLoginSource(LOGIN_SOURCE.HOME_LIST);
    setLoginSource(LOGIN_SOURCE.RESULT);

    expect(consumeLoginSource()).toBe('result');
  });

  it('sessionStorage 접근이 실패해도 throw 하지 않는다', () => {
    stubThrowingSessionStorage();

    expect(() => setLoginSource(LOGIN_SOURCE.RESULT)).not.toThrow();
  });
});

describe('consumeLoginSource', () => {
  it('저장된 적 없으면 null 을 반환한다', () => {
    stubSessionStorage();

    expect(consumeLoginSource()).toBeNull();
  });

  it('읽은 뒤 값을 지워 가입 완료 이벤트 1건에만 실리게 한다', () => {
    stubSessionStorage();
    setLoginSource(LOGIN_SOURCE.HOME_EMPTY);

    expect(consumeLoginSource()).toBe('home_empty');
    expect(consumeLoginSource()).toBeNull();
  });

  it('화이트리스트 밖 값은 null 로 걸러 GA 차원 오염을 막는다', () => {
    const store = stubSessionStorage();
    store.set(LOGIN_SOURCE_KEY, 'unknown_place');

    expect(consumeLoginSource()).toBeNull();
  });

  it('sessionStorage 접근이 실패해도 throw 하지 않고 null 을 반환한다', () => {
    stubThrowingSessionStorage();

    expect(consumeLoginSource()).toBeNull();
  });

  it('서버 렌더 중에는 null 을 반환한다', () => {
    vi.stubGlobal('window', void 0);

    expect(consumeLoginSource()).toBeNull();
  });
});
