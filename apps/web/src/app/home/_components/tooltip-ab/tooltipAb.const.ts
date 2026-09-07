import { CompareIconFill, ShoppingBagIconFill } from '@/assets/icons/fill';
import { AB_VARIANT, type AbVariantT } from '@/consts/abTest';

type TooltipContentT = {
  Icon: typeof CompareIconFill;
  iconClassName: string;
  message: string;
};

/** 라이팅 실험 — A 는 동작 방식, B 는 사용 시점을 말한다 */
export const TOOLTIP_CONTENT: Record<AbVariantT, TooltipContentT> = {
  [AB_VARIANT.A]: {
    Icon: CompareIconFill,
    iconClassName: 'text-sky-blue-300',
    message: '위시를 1:1로 비교해 골라요',
  },
  [AB_VARIANT.B]: {
    Icon: ShoppingBagIconFill,
    iconClassName: 'text-sky-blue-200',
    message: '갖고싶은게 너무 많을땐?',
  },
};
