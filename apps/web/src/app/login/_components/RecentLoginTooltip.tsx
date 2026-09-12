/** 최근 로그인한 수단 버튼 위에 붙는 말풍선 */
function RecentLoginTooltip() {
  return (
    <div className="pointer-events-none absolute -top-11 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
      <div className="flex min-h-9 items-center justify-center rounded-xl bg-bg-neutral-secondary px-3 py-1.5">
        <p className="caption-1-regular whitespace-nowrap text-text-neutral-inverse">최근 로그인</p>
      </div>

      {/* 버튼 위쪽을 가리키는 꼬리 — 회전 사각형으로는 시안의 납작한 비율이 안 나온다 */}
      <div
        aria-hidden
        className="h-2 w-5.25 bg-bg-neutral-secondary [clip-path:polygon(0_0,100%_0,50%_100%)]"
      />
    </div>
  );
}

export default RecentLoginTooltip;
