'use client';

import type { AbVariantT } from '@/consts/abTest';

import { TOOLTIP_CONTENT } from './tooltipAb.const';

type TooltipAbProps = {
  variant: AbVariantT;
};

function TooltipAb({ variant }: TooltipAbProps) {
  const { Icon, iconClassName, message } = TOOLTIP_CONTENT[variant];

  return (
    <div className="pointer-events-none absolute -top-11 right-0 z-10 flex flex-col items-center">
      <div className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-2">
        <Icon aria-hidden className={`size-4.5 shrink-0 ${iconClassName}`} />
        <p className="caption-1-semibold whitespace-nowrap text-text-neutral-inverse">{message}</p>
      </div>

      {/* 카드 위쪽을 가리키는 꼬리 — 회전 사각형으로는 시안의 납작한 비율이 안 나온다 */}
      <div
        aria-hidden
        className="h-2 w-5.25 bg-gray-800 [clip-path:polygon(0_0,100%_0,50%_100%)]"
      />
    </div>
  );
}

export default TooltipAb;
