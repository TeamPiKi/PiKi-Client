import type { ReactNode } from 'react';

import { TooltipTailIconFill } from '@/assets/icons';
import { cn } from '@/utils/cn';

type TooltipProps = {
  /** 말풍선 문구 */
  children: ReactNode;
  /** 문구 앞에 붙는 18px 아이콘 — 생략 시 텍스트 전용 */
  icon?: ReactNode;
  /** 배치용 클래스 — 기준 요소에 relative 를 주고 위치를 지정한다 */
  className?: string;
};

/** 디자인 시스템 툴팁 — 아래를 가리키는 꼬리가 달린 말풍선 */
function Tooltip({ children, icon, className }: TooltipProps) {
  return (
    <div
      className={cn(
        'pointer-events-none flex flex-col items-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)]',
        className
      )}
    >
      <div
        className={cn(
          'flex min-h-9 items-center justify-center rounded-xl bg-bg-neutral-secondary px-3 py-1.5',
          /** 간격은 아이콘 변형에만 — 텍스트 전용은 자식이 하나라 DS 에도 gap 이 없다 */
          icon && 'gap-1'
        )}
      >
        {icon}
        <p className="max-w-61.75 caption-1-regular whitespace-nowrap text-text-neutral-inverse">
          {children}
        </p>
      </div>

      <TooltipTailIconFill aria-hidden className="-mt-px shrink-0 text-bg-neutral-secondary" />
    </div>
  );
}

export default Tooltip;
