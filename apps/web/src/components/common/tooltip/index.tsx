import type { ReactNode } from 'react';

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
      <div className="flex min-h-9 items-center justify-center gap-1 rounded-xl bg-bg-neutral-secondary px-3 py-1.5">
        {icon}
        <p className="max-w-[247px] whitespace-nowrap caption-1-regular text-text-neutral-inverse">
          {children}
        </p>
      </div>

      {/* 아래를 가리키는 꼬리 — 회전 사각형으로는 시안의 납작한 비율이 안 나온다 */}
      <div
        aria-hidden
        className="h-2 w-5.25 bg-bg-neutral-secondary [clip-path:polygon(0_0,100%_0,50%_100%)]"
      />
    </div>
  );
}

export default Tooltip;
