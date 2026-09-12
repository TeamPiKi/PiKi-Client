import Tooltip from '@/components/common/tooltip';

/**
 * 최근 로그인한 수단 버튼 위에 붙는 말풍선.
 *
 * 시안(2592:19810) 기준 — 버튼 상단에서 위로 38.91px 지점에 툴팁 상단, 가로는 버튼 중앙.
 * 꼬리 끝(툴팁 높이 44.04px)이 버튼 위로 약 5px 겹친다.
 */
function RecentLoginTooltip() {
  return (
    <Tooltip className="absolute -top-[38.91px] left-1/2 z-10 -translate-x-1/2">최근 로그인</Tooltip>
  );
}

export default RecentLoginTooltip;
