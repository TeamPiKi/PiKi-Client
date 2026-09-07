import type { AbVariantT } from '@/consts/abTest';
import { AB_VARIANT } from '@/consts/abTest';

const isAbVariant = (value: string | null): value is AbVariantT =>
  value === AB_VARIANT.A || value === AB_VARIANT.B;

/**
 * A/B 그룹을 읽고, 없으면 50:50 으로 배정해 저장한다.
 *
 * 한 사용자가 방문할 때마다 다른 그룹을 보면 두 그룹 데이터가 섞여 실험이 무의미해지므로
 * 최초 1회만 배정하고 이후에는 저장값을 그대로 쓴다.
 * 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 `null` 을 반환해 실험에서 제외한다.
 */
export const getOrAssignAbVariant = (key: string): AbVariantT | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(key);
    if (isAbVariant(stored)) return stored;

    const assigned = Math.random() < 0.5 ? AB_VARIANT.A : AB_VARIANT.B;
    window.localStorage.setItem(key, assigned);

    return assigned;
  } catch {
    return null;
  }
};

/**
 * `useSyncExternalStore` 용 스냅샷 — 서버에서는 항상 `null` 을 돌려준다.
 *
 * 배정은 최초 1회만 일어나고 이후에는 저장값을 그대로 읽으므로 스냅샷이 안정적이다.
 * (매번 다른 값을 반환하면 무한 렌더가 난다.)
 */
export const subscribeAbVariant = () => () => {};

export const getAbVariantServerSnapshot = (): AbVariantT | null => null;
