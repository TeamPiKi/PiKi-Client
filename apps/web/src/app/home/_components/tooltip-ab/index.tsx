'use client';

import Tooltip from '@/components/common/tooltip';
import type { AbVariantT } from '@/consts/abTest';

import { TOOLTIP_CONTENT } from './tooltipAb.const';

type TooltipAbProps = {
  variant: AbVariantT;
};

function TooltipAb({ variant }: TooltipAbProps) {
  const { Icon, iconClassName, message } = TOOLTIP_CONTENT[variant];

  return (
    <Tooltip
      className="absolute -top-11 right-0 z-10"
      icon={<Icon aria-hidden className={`size-4.5 shrink-0 ${iconClassName}`} />}
    >
      {message}
    </Tooltip>
  );
}

export default TooltipAb;
