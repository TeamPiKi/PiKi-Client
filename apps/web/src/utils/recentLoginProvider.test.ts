import { afterEach, describe, expect, it, vi } from 'vitest';

import { RECENT_LOGIN_PROVIDER_KEY } from '@/consts/recentLoginProvider';

import {
  clearRecentLoginProvider,
  getRecentLoginProvider,
  setRecentLoginProvider,
} from './recentLoginProvider';

/** node 환경이라 localStorage 가 없다 — 저장소를 직접 세워 실제 읽기·쓰기 경로를 태운다 */
const stubLocalStorage = () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };

  vi.stubGlobal('window', { localStorage: storage });

  return store;
};

/** private mode 등 접근 자체가 throw 하는 환경 */
const stubThrowingLocalStorage = () => {
  const throwAccess = () => {
    throw new Error('localStorage 접근 차단');
  };

  vi.stubGlobal('window', {
    localStorage: { getItem: throwAccess, setItem: throwAccess, removeItem: throwAccess },
  });
};

afterEach(() => vi.unstubAllGlobals());

describe('getRecentLoginProvider', () => {
  it('저장된 적 없으면 null 을 반환한다', () => {
    stubLocalStorage();

    expect(getRecentLoginProvider()).toBeNull();
  });

  it('화이트리스트에 있는 provider 만 반환한다', () => {
    const store = stubLocalStorage();
    store.set(RECENT_LOGIN_PROVIDER_KEY, 'kakao');

    expect(getRecentLoginProvider()).toBe('kakao');
  });

  it('화이트리스트 밖 값은 null 로 걸러 말풍선 대상에서 제외한다', () => {
    const store = stubLocalStorage();
    store.set(RECENT_LOGIN_PROVIDER_KEY, 'naver');

    expect(getRecentLoginProvider()).toBeNull();
  });

  it('localStorage 접근이 실패해도 throw 하지 않고 null 을 반환한다', () => {
    stubThrowingLocalStorage();

    expect(getRecentLoginProvider()).toBeNull();
  });

  it('서버 렌더 중에는 null 을 반환한다', () => {
    vi.stubGlobal('window', void 0);

    expect(getRecentLoginProvider()).toBeNull();
  });
});

describe('setRecentLoginProvider', () => {
  it('마지막 로그인 수단 하나만 남도록 덮어쓴다', () => {
    stubLocalStorage();

    setRecentLoginProvider('google');
    setRecentLoginProvider('apple');

    expect(getRecentLoginProvider()).toBe('apple');
  });

  it('localStorage 접근이 실패해도 throw 하지 않는다', () => {
    stubThrowingLocalStorage();

    expect(() => setRecentLoginProvider('google')).not.toThrow();
  });
});

describe('clearRecentLoginProvider', () => {
  it('저장된 힌트를 지운다', () => {
    stubLocalStorage();
    setRecentLoginProvider('kakao');

    clearRecentLoginProvider();

    expect(getRecentLoginProvider()).toBeNull();
  });

  it('localStorage 접근이 실패해도 throw 하지 않는다', () => {
    stubThrowingLocalStorage();

    expect(() => clearRecentLoginProvider()).not.toThrow();
  });
});
