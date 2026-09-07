/** A/B 테스트 그룹 — GA 리포트에서 이 값으로 분해한다 */
export const AB_VARIANT = {
  A: 'A',
  B: 'B',
} as const;

export type AbVariantT = (typeof AB_VARIANT)[keyof typeof AB_VARIANT];

/** 홈 툴팁 라이팅 실험 (A: 동작 방식 설명 · B: 사용 시점 설명) */
export const TOOLTIP_VARIANT_KEY = 'piki:ab:tooltip_variant';
