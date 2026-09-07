import { forwardRef, useLayoutEffect, useRef } from 'react';

import PikiLogoCart from '@/assets/images/piki-logo-cart.svg';

import type { RankedProductT } from '../../../_common/_types/tournament';
import ReceiptPaper from '../ReceiptPaper';

/** 좁은 폭으로 레이아웃한 뒤 zoom 으로 확대해 최종 폭을 만든다 */
const RECEIPT_PAPER_WIDTH_PX = 370;
const RECEIPT_ZOOM = 1.42;
const RECEIPT_RENDER_WIDTH_PX = RECEIPT_PAPER_WIDTH_PX / RECEIPT_ZOOM;

/** 이 높이를 넘길 때만 배율을 낮춘다 — 로고 위까지 남는 공간 */
const RECEIPT_MAX_HEIGHT_PX = 750;

/** 종이가 짧을 때 내려오는 여백 — 길어지면 이만큼까지 잠식한다 */
const RECEIPT_TOP_OFFSET_PX = 65;

/** 공유 이미지 전용 — 화면 영수증은 읽기 크기를 유지한다 */
const SHARE_PRODUCT_NAME_FONT_SIZE_PX = 12.2;
const SHARE_PRODUCT_NAME_LINE_HEIGHT_PX = 17.4;

type ReceiptShareCaptureLayerProps = {
  tournamentId: number;
  tournamentName: string;
  result: RankedProductT[];
  date: Date;
};

const ReceiptShareCaptureLayer = forwardRef<HTMLDivElement, ReceiptShareCaptureLayerProps>(
  function ReceiptShareCaptureLayer({ tournamentId, tournamentName, result, date }, ref) {
    const paperRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<HTMLDivElement>(null);
    const paperAreaRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      const paper = paperRef.current;
      const zoomWrap = zoomRef.current;
      if (!paper || !zoomWrap) return;

      /** line-clamp 의 말줄임표는 캡처 복제본에 남지 않아 글자로 직접 넣는다 */
      paper.querySelectorAll<HTMLElement>('[data-receipt-product-name]').forEach(name => {
        name.style.fontSize = `${SHARE_PRODUCT_NAME_FONT_SIZE_PX}px`;
        name.style.lineHeight = `${SHARE_PRODUCT_NAME_LINE_HEIGHT_PX}px`;

        const fullText = name.dataset.fullText ?? name.textContent ?? '';
        name.dataset.fullText = fullText;
        name.textContent = fullText;
        if (name.scrollHeight <= name.clientHeight) return;

        /** 들어가는 최대 글자 수 */
        let low = 0;
        let high = fullText.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          name.textContent = `${fullText.slice(0, mid).trimEnd()}…`;
          if (name.scrollHeight > name.clientHeight) high = mid - 1;
          else low = mid;
        }
        name.textContent = `${fullText.slice(0, low).trimEnd()}…`;
      });

      let best = 0;
      let candidate = RECEIPT_ZOOM;

      for (let i = 0; i < 6; i += 1) {
        zoomWrap.style.zoom = String(candidate);
        zoomWrap.style.width = `${RECEIPT_PAPER_WIDTH_PX / candidate}px`;

        const height = paper.scrollHeight * candidate;
        if (!height) return;

        if (height <= RECEIPT_MAX_HEIGHT_PX) best = Math.max(best, candidate);

        const next = Math.min(RECEIPT_ZOOM, (candidate * RECEIPT_MAX_HEIGHT_PX) / height);
        if (Math.abs(next - candidate) < 0.002) break;
        candidate = next;
      }

      const fitZoom = best || candidate;
      zoomWrap.style.zoom = String(fitZoom);
      zoomWrap.style.width = `${RECEIPT_PAPER_WIDTH_PX / fitZoom}px`;

      /** 남는 만큼만 내린다 — 종이가 길면 0 이 되어 위로 붙는다 */
      const spare = RECEIPT_MAX_HEIGHT_PX - paper.scrollHeight * fitZoom;
      paperAreaRef.current?.style.setProperty(
        'padding-top',
        `${Math.max(0, Math.min(RECEIPT_TOP_OFFSET_PX, spare))}px`
      );
    }, [result, tournamentName, date]);

    return (
      <div aria-hidden className="pointer-events-none fixed top-0 -left-250">
        <div
          ref={ref}
          className="flex h-240 w-135 flex-col items-center justify-between bg-sky-blue-200 pt-21.75 pb-11.25"
        >
          <div ref={paperAreaRef} className="flex w-92.5 items-center justify-center">
            <div ref={zoomRef} style={{ zoom: RECEIPT_ZOOM, width: RECEIPT_RENDER_WIDTH_PX }}>
              <div ref={paperRef}>
                <ReceiptPaper
                  tournamentId={tournamentId}
                  tournamentName={tournamentName}
                  result={result}
                  date={date}
                />
              </div>
            </div>
          </div>

          <PikiLogoCart aria-hidden className="h-8 w-11 shrink-0 text-white" />
        </div>
      </div>
    );
  }
);

export default ReceiptShareCaptureLayer;
