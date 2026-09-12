import type { LoginSourceT } from '@/consts/loginSource';
import { LOGIN_SOURCE, LOGIN_SOURCE_KEY } from '@/consts/loginSource';

/** 저장값 검증용 화이트리스트 — 손상된 값이 GA 차원으로 새지 않도록 읽을 때 대조한다 */
const LOGIN_SOURCES: readonly string[] = Object.values(LOGIN_SOURCE);

const isLoginSource = (value: string | null): value is LoginSourceT =>
  !!value && LOGIN_SOURCES.includes(value);

/**
 * 로그인 유입 지점 기록.
 *
 * 로그인 페이지와 OAuth 리다이렉트를 거치며 클릭 이벤트의 location 이 사라지므로,
 * 가입 완료 시점까지 들고 가기 위해 클릭 지점에서 저장한다.
 * sessionStorage 를 쓰는 이유는 탭을 닫으면 유입 맥락도 끝나기 때문이다.
 */
export const setLoginSource = (source: LoginSourceT) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(LOGIN_SOURCE_KEY, source);
  } catch {
    /** private mode 등 — 계측은 부가 기능이라 로그인 흐름을 막지 않는다 */
  }
};

/** 로그인 유입 지점을 읽고 지운다 — 가입 완료 이벤트 1건에만 실리도록 소비형으로 둔다 */
export const consumeLoginSource = (): LoginSourceT | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedSource = window.sessionStorage.getItem(LOGIN_SOURCE_KEY);
    window.sessionStorage.removeItem(LOGIN_SOURCE_KEY);

    return isLoginSource(storedSource) ? storedSource : null;
  } catch {
    return null;
  }
};
