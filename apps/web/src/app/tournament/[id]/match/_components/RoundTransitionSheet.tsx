'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import type { TransitionStageT } from '../_utils/rounds';
import './RoundTransitionSheet.css';

// ── Countdown arc ─────────────────────────────────────────────────────────────
const ARC_SIZE = 40;
const ARC_STROKE = 1.5;
const ARC_RADIUS = (ARC_SIZE - ARC_STROKE) / 2;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
const COUNTDOWN = 3;

// ── Mini bracket layout (px) ─────────────────────────────────────────────────
// Container: width=320, height=267.053 (from design spec)
const MC = 160 / 3; // 53.333 – card size
const MB_W = 320;
const MB_H = 267.053;
const MP = 4; // breathing room for pop animation
const MLW = 2; // line width

// MG derived so total height == MB_H: 2*MP + 3*MC + 2*MG = MB_H
const MG = (MB_H - 3 * MC - 2 * MP) / 2; // ≈ 49.527

const MY_F = MP;
const MY_S = MP + MC + MG;
const MY_Q = MP + MC + MG + MC + MG;

const MHF_BOT = MY_F + MC;
const MHB_SEMI = MHF_BOT + MG / 2;
const MSB = MY_S + MC;
const MHB_Q = MSB + MG / 2;

// ── Types ────────────────────────────────────────────────────────────────────
type MBIconT = 'shirt' | 'pants' | 'cap' | 'bag' | 'question' | 'trophy';

type MBCardT = {
  xPct: number;
  top: number;
  isBlue: boolean;
  icon: MBIconT;
  isArriving?: boolean;
  isDimmed?: boolean;
  fadeDelay: string;
  arriveDelay?: string;
};

type ConnPathT = { d: string; isBlue: boolean; delay: string };

// ── Bracket data per stage ───────────────────────────────────────────────────
const getCards = (stage: TransitionStageT): MBCardT[] => {
  const isSemi = stage === 'toSemi';
  return [
    { xPct: 12.5, top: MY_Q, isBlue: isSemi, isDimmed: !isSemi, icon: 'shirt', fadeDelay: '0.3s' },
    { xPct: 37.5, top: MY_Q, isBlue: isSemi, isDimmed: !isSemi, icon: 'pants', fadeDelay: '0.35s' },
    { xPct: 62.5, top: MY_Q, isBlue: isSemi, isDimmed: !isSemi, icon: 'cap', fadeDelay: '0.4s' },
    { xPct: 87.5, top: MY_Q, isBlue: isSemi, isDimmed: !isSemi, icon: 'bag', fadeDelay: '0.45s' },
    {
      xPct: 25,
      top: MY_S,
      isBlue: !isSemi,
      icon: isSemi ? 'question' : 'shirt',
      fadeDelay: '0.2s',
      isArriving: isSemi,
      arriveDelay: '1s',
    },
    {
      xPct: 75,
      top: MY_S,
      isBlue: !isSemi,
      icon: isSemi ? 'question' : 'cap',
      fadeDelay: '0.25s',
      isArriving: isSemi,
      arriveDelay: '1.05s',
    },
    {
      xPct: 50,
      top: MY_F,
      isBlue: false,
      icon: 'trophy',
      fadeDelay: isSemi ? '1.2s' : '0.15s',
      isArriving: !isSemi,
      arriveDelay: '1.05s',
    },
  ];
};

const R = 6.662; // connector corner radius (Figma spec)
const K = 0.5523; // cubic bezier factor for quarter-circle approximation

// Open U: two arms go DOWN from H-bar to card tops
const makeU = (lx: number, rx: number, hY: number, cardY: number) =>
  `M${lx} ${cardY}` +
  `V${hY + R}` +
  `C${lx} ${hY + R * (1 - K)} ${lx + R * (1 - K)} ${hY} ${lx + R} ${hY}` +
  `H${rx - R}` +
  `C${rx - R * (1 - K)} ${hY} ${rx} ${hY + R * (1 - K)} ${rx} ${hY + R}` +
  `V${cardY}`;
// Trunk: straight line from parent card bottom down to H-bar center
const makeTrunk = (cx: number, fromY: number, toY: number) => `M${cx} ${fromY}V${toY}`;

const getPaths = (stage: TransitionStageT): ConnPathT[] => {
  const isSemi = stage === 'toSemi';
  const Q1 = 0.125 * MB_W,
    Q2 = 0.375 * MB_W,
    Q3 = 0.625 * MB_W,
    Q4 = 0.875 * MB_W;
  const SL = 0.25 * MB_W,
    SR = 0.75 * MB_W,
    FC = 0.5 * MB_W;

  return [
    { d: makeU(Q1, Q2, MHB_Q, MY_Q), isBlue: isSemi, delay: isSemi ? '0.5s' : '0.3s' },
    { d: makeU(Q3, Q4, MHB_Q, MY_Q), isBlue: isSemi, delay: isSemi ? '0.5s' : '0.3s' },
    { d: makeTrunk(SL, MSB, MHB_Q), isBlue: isSemi, delay: isSemi ? '0.7s' : '0.45s' },
    { d: makeTrunk(SR, MSB, MHB_Q), isBlue: isSemi, delay: isSemi ? '0.7s' : '0.45s' },
    { d: makeU(SL, SR, MHB_SEMI, MY_S), isBlue: !isSemi, delay: isSemi ? '1.1s' : '0.5s' },
    { d: makeTrunk(FC, MHF_BOT, MHB_SEMI), isBlue: !isSemi, delay: isSemi ? '1.15s' : '0.7s' },
  ];
};

// ── Icons (모두 인라인 SVG — SVGR 컴포넌트는 width/height 무시) ───────────────
function renderIcon(icon: MBIconT) {
  if (icon === 'shirt') {
    return (
      <svg width={35} height={35} viewBox="0 0 39 40" fill="none" aria-hidden>
        <path
          d="M18.9859 0.00732298C19.9384 -0.0253173 21.1453 0.0534548 22.0827 0.197791C23.1967 0.362378 24.2926 0.634249 25.3552 1.00958C25.961 1.2231 26.5998 1.48493 27.1758 1.77508C27.3921 1.88406 27.6921 2.17677 27.9202 2.26824C29.0122 2.70615 30.1068 3.14549 31.1988 3.58248C32.0457 3.9213 32.7352 4.16868 33.5135 4.65837C34.4216 5.23048 35.2128 5.97145 35.8456 6.84165C36.781 8.1297 37.2958 9.81992 37.8927 11.2928C38.3426 12.4034 38.9819 13.635 38.7878 14.8504C38.6971 15.4457 38.4474 16.0051 38.0657 16.4688C37.6831 16.9302 36.2321 17.9741 35.6976 18.3701C34.6707 19.131 33.6219 19.9652 32.5908 20.7106L32.5973 32.6468C32.5979 33.3983 32.6304 34.2499 32.4785 34.98C32.285 35.872 31.851 36.6931 31.2238 37.353C30.7438 37.8602 30.1599 38.2564 29.513 38.5147C28.8603 38.7771 28.1067 38.8979 27.4177 39.0345C24.8642 39.5403 22.4569 39.7207 19.8654 39.7841C17.0601 39.8112 14.2588 39.5654 11.5004 39.0501C10.8521 38.9282 9.97533 38.7735 9.37574 38.5379C8.75427 38.2909 8.18921 37.9193 7.71498 37.4452C7.04921 36.7817 6.58164 35.9436 6.36537 35.0258C6.19625 34.2774 6.23327 33.4416 6.23386 32.6719L6.23206 20.696C5.95481 20.5161 5.584 20.2181 5.31264 20.0132L3.61374 18.7308L2.04254 17.5479C1.73145 17.3137 1.34796 17.0414 1.06512 16.7824C0.414164 16.1832 0.0308243 15.3449 0.00183788 14.4573C-0.00995892 14.1003 0.0350938 13.7438 0.135282 13.4013C0.294511 12.8366 0.82722 11.5702 1.06787 10.9779C1.45324 10.0294 1.93679 8.63316 2.40468 7.76989C2.73125 7.16511 3.13099 6.60344 3.59478 6.09766C4.87192 4.71005 5.922 4.25673 7.61057 3.58528L9.81773 2.70699C10.1775 2.5639 10.5543 2.42061 10.9103 2.27172C11.179 2.14656 11.4185 1.88994 11.6797 1.7611C14.0079 0.612583 16.4093 0.106658 18.9859 0.00732298Z"
          fill="currentColor"
        />
        <path
          d="M19.3097 3.52943C21.1706 3.52717 22.6377 3.80036 24.385 4.40396C23.0811 7.14972 21.6504 9.12452 19.4576 11.2068C19.4501 11.2134 19.4118 11.2257 19.4004 11.2299C19.0749 10.9594 18.6136 10.4797 18.3256 10.1776C16.6807 8.4528 15.4597 6.53706 14.4385 4.39926C16.2636 3.80103 17.3754 3.58148 19.3097 3.52943Z"
          fill="#F4F4F6"
        />
      </svg>
    );
  }
  if (icon === 'pants') {
    return (
      <svg width={25} height={33} viewBox="0 0 31 38" fill="none" aria-hidden>
        <path
          d="M25.769 0.269394C25.8832 0.358946 25.9717 0.548319 26.0147 0.672377C26.961 3.41398 27.5504 6.64441 27.8821 9.47803C28.6491 16.0342 29.0416 22.631 29.717 29.195C29.9533 31.495 30.3714 33.8866 30.5018 36.1792C30.5228 36.5498 30.6045 36.9224 30.1717 37.152C29.5676 37.4732 27.2292 37.4001 26.3872 37.4301C24.5869 37.4938 22.6195 37.6458 20.8359 37.6367C20.4393 37.6347 20.0861 37.474 19.9593 37.1738C18.7563 30.8694 17.8012 24.5334 16.5568 18.234C16.2167 16.5124 15.9295 15.9985 15.2855 14.3372C15.093 13.8404 14.9147 13.9203 14.8 14.3372C14.5364 15.2956 14.3619 16.2794 14.1639 17.2481C12.888 23.4826 11.9889 29.7644 10.7943 36.0084C10.7314 36.3378 10.677 36.9573 10.5266 37.2362C10.3977 37.4745 10.0498 37.6334 9.72546 37.6384C8.87455 37.6511 7.86961 37.5381 7.00561 37.5118C5.10365 37.4543 3.01621 37.4905 1.13574 37.3488C0.79412 37.3229 0.342471 37.2091 0.137604 36.9811C-0.0368727 36.7868 0.000852082 36.5724 0.00923536 36.3431C0.0783974 34.3829 0.484462 32.239 0.689329 30.2627C1.38566 23.5463 1.82841 16.8048 2.57609 10.0934C2.88365 7.33413 3.38822 4.59458 4.17311 1.89735C4.27213 1.55639 4.46652 0.624315 4.64938 0.381128C4.7919 0.190933 5.08479 0.113705 5.33995 0.0598919C11.7877 -0.0604689 18.2586 0.044282 24.7153 0.00690031C25.0438 0.050033 25.5227 0.0750911 25.7695 0.268983L25.769 0.269394Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (icon === 'cap') {
    return (
      <svg width={38} height={31} viewBox="0 0 43 35" fill="none" aria-hidden>
        <path
          d="M17.6841 0.0131238C21.4895 -0.116644 25.2257 0.708126 28.4261 2.83585C32.1056 5.28234 34.4896 9.72585 35.2719 13.9944C35.349 14.4258 35.41 14.8599 35.4551 15.2959C35.5613 16.331 35.5814 17.1798 36.3457 17.9911C37.7058 19.4342 39.0722 20.8661 40.3648 22.3717C41.1573 23.2947 42.0644 24.0664 42.2915 25.3219C42.7117 27.6435 40.9187 29.5924 38.7156 30.008C37.1013 30.3091 35.5507 29.3766 34.3314 28.4204C33.9603 28.1292 33.5715 27.7541 33.1903 27.4907L33.1643 27.473C32.3567 27.8852 31.5803 28.2308 30.7569 28.67C28.7943 29.7176 26.909 30.9035 25.1155 32.2184C24.6463 32.5586 24.2036 32.9405 23.7252 33.2666C22.8453 33.8659 21.7274 34.2573 20.6632 34.3118C16.4677 34.5268 12.9788 30.7125 10.3325 27.9597C10.0019 27.6157 8.79946 26.297 8.48592 26.1296C8.00482 25.8731 7.41949 25.896 6.89043 25.9097C5.04055 25.9575 3.4704 26.0075 1.99208 24.6693C0.811171 23.6003 0.491466 22.5054 0.254413 20.9887C0.144306 20.2722 0.0691742 19.5507 0.0292791 18.8267C-0.213095 14.0023 1.03368 9.38026 4.3537 5.78288C6.81348 3.11758 10.3756 1.31436 13.8839 0.516822C15.1323 0.232271 16.4045 0.0636729 17.6841 0.0131238Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (icon === 'bag') {
    return (
      <svg width={35} height={35} viewBox="0 0 39 39" fill="none" aria-hidden>
        <path
          d="M18.7486 0.0172443C23.3845 -0.238971 27.661 2.37214 28.798 7.03474C28.9572 7.68781 29.0328 8.28583 29.0951 8.95512C34.9301 10.3975 35.857 15.1896 37.241 20.2722C38.0901 23.3905 38.7015 25.8244 38.8151 29.0657C39.0088 34.5934 35.8582 37.253 30.6634 38.1208C27.0317 38.7563 23.7183 38.7803 20.0326 38.8177C15.519 38.845 7.77461 38.8653 3.84618 36.7035C2.11656 35.7516 0.940772 34.3255 0.393074 32.424C-0.037456 30.9292 -0.0576217 29.3239 0.0654388 27.7842C0.262238 25.3223 0.886804 22.9591 1.50053 20.577C2.13105 18.1299 2.75904 15.4629 3.98862 13.2452C5.31519 10.8526 7.15056 9.69205 9.73674 8.9509C9.97239 3.83325 13.7624 0.420809 18.7486 0.0172443Z"
          fill="currentColor"
        />
        <path
          d="M11.2237 14.5638C11.473 14.5403 11.9274 14.5512 12.1835 14.5512L26.535 14.5518C27.1563 14.552 27.8834 14.4719 28.4149 14.8382C28.7705 15.0855 29.0132 15.4645 29.0885 15.8912C29.1617 16.314 29.0648 16.7487 28.8185 17.1C28.5288 17.5093 28.1498 17.6914 27.6708 17.775C26.7667 17.8288 25.5106 17.7899 24.5791 17.7897L13.802 17.7898C12.9648 17.7898 12.0952 17.8029 11.2597 17.7722C10.8898 17.7586 10.6536 17.6875 10.3571 17.4628C10.0042 17.1978 9.77353 16.8014 9.71759 16.3636C9.59732 15.3879 10.2807 14.678 11.2237 14.5638Z"
          fill="#F4F4F6"
        />
        <path
          d="M19.18 3.23781C20.5724 3.15613 22.213 3.60353 23.3479 4.41199C24.7401 5.40359 25.4742 6.7062 25.7706 8.35673C23.6003 8.16527 21.8233 8.09909 19.6379 8.08569C17.4385 8.06033 15.2393 8.15042 13.0493 8.35555C13.5887 5.14786 16.0435 3.40095 19.18 3.23781Z"
          fill="#F4F4F6"
        />
      </svg>
    );
  }
  if (icon === 'question') {
    return (
      <svg width={27} height={27} viewBox="0 0 26.667 26.667" fill="none" aria-hidden>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M26.6667 13.3333C26.6667 20.6971 20.6971 26.6667 13.3333 26.6667C5.96954 26.6667 0 20.6971 0 13.3333C0 5.96954 5.96954 0 13.3333 0C20.6971 0 26.6667 5.96954 26.6667 13.3333ZM14.6667 21.3333C14.6667 22.0697 14.0697 22.6667 13.3333 22.6667C12.597 22.6667 12 22.0697 12 21.3333C12 20.597 12.597 20 13.3333 20C14.0697 20 14.6667 20.597 14.6667 21.3333ZM10.818 9.77766C11.1847 8.74014 12.1743 8 13.3333 8C14.8061 8 16 9.19391 16 10.6667C16 12.1394 14.8061 13.3333 13.3333 13.3333C12.5969 13.3333 12 13.9303 12 14.6667V16.6667C12 17.403 12.5969 18 13.3333 18C14.0697 18 14.6666 17.403 14.6666 16.6667V15.832C16.9669 15.2399 18.6666 13.1518 18.6666 10.6667C18.6666 7.72115 16.2788 5.33333 13.3333 5.33333C11.0091 5.33333 9.03531 6.81935 8.30379 8.88901C8.05839 9.58329 8.42229 10.3451 9.11658 10.5905C9.81087 10.8358 10.5726 10.4719 10.818 9.77766Z"
          fill="#ADB1BB"
        />
      </svg>
    );
  }
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.33594 2.66675C7.86318 2.66675 6.66927 3.86066 6.66927 5.33341L4.0026 5.33341C2.52984 5.33341 1.33594 6.52732 1.33594 8.00008V10.6667C1.33594 13.6123 3.72375 16.0001 6.66927 16.0001H7.05578C8.08032 19.4426 11.0376 22.0528 14.6693 22.5722V26.6667H10.6693C9.93289 26.6667 9.33594 27.2637 9.33594 28.0001C9.33594 28.7365 9.93289 29.3334 10.6693 29.3334H21.3359C22.0723 29.3334 22.6693 28.7365 22.6693 28.0001C22.6693 27.2637 22.0723 26.6667 21.3359 26.6667H17.3359V22.5722C20.9676 22.0528 23.9249 19.4426 24.9494 16.0001H25.3359C28.2815 16.0001 30.6693 13.6123 30.6693 10.6667V8.00008C30.6693 6.52732 29.4754 5.33341 28.0026 5.33341H25.3359C25.3359 3.86066 24.142 2.66675 22.6693 2.66675H9.33594ZM25.3359 8.00008V13.3334C26.8087 13.3334 28.0026 12.1395 28.0026 10.6667V8.00008H25.3359ZM6.66927 8.00008H4.0026V10.6667C4.0026 12.1395 5.19651 13.3334 6.66927 13.3334V8.00008Z"
        fill="#C5C8CE"
      />
    </svg>
  );
}

// ── Mini bracket ─────────────────────────────────────────────────────────────
function MiniBracket({ stage }: { stage: TransitionStageT }) {
  const cards = getCards(stage);
  const paths = getPaths(stage);

  return (
    <div className="relative" style={{ width: MB_W, height: MB_H }}>
      {/* SVG connector paths — rounded via stroke-linejoin */}
      <svg aria-hidden style={{ position: 'absolute', inset: 0, width: MB_W, height: MB_H }}>
        {paths.map((path, i) =>
          path.isBlue ? (
            <path
              key={i}
              d={path.d}
              fill="none"
              stroke="var(--color-sky-blue-200)"
              strokeWidth={MLW}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100}
              className="mb-conn-path"
              style={{ '--mb-d': path.delay } as CSSProperties}
            />
          ) : (
            <path
              key={i}
              d={path.d}
              fill="none"
              stroke="#E8EAF0"
              strokeWidth={MLW}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-conn-gray"
              style={{ '--mb-d': path.delay } as CSSProperties}
            />
          )
        )}
      </svg>

      {cards.map((card, i) => (
        <div
          key={i}
          className={[
            card.isArriving ? 'mb-card-arriving' : 'mb-card',
            card.isDimmed ? 'opacity-50' : '',
          ].join(' ')}
          style={
            {
              position: 'absolute',
              left: `calc(${card.xPct}% - ${MC / 2}px)`,
              top: card.top,
              width: MC,
              height: MC,
              '--mb-d': card.fadeDelay,
              '--mb-arrive-d': card.arriveDelay ?? '1s',
            } as CSSProperties
          }
        >
          <div
            className={[
              'flex size-full items-center justify-center rounded-[12px] border-[1.85px] border-white',
              card.isBlue ? 'bg-sky-blue-50 text-sky-blue-200' : 'bg-[#F4F4F6] text-[#C5C8CE]',
            ].join(' ')}
            style={{ boxShadow: '0 0 6.662px 0 rgba(0,0,0,0.16)' }}
          >
            {renderIcon(card.icon)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
type RoundTransitionSheetProps = {
  stage: TransitionStageT;
  onComplete: () => void;
};

function RoundTransitionSheet({ stage, onComplete }: RoundTransitionSheetProps) {
  const [remaining, setRemaining] = useState(COUNTDOWN);
  const [ringStarted, setRingStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRingStarted(true), 450);
    return () => clearTimeout(t);
  }, []);

  const handleSkip = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => onComplete(), 450);
  }, [isExiting, onComplete]);

  useEffect(() => {
    if (!ringStarted) return;
    if (remaining <= 0) {
      const t = setTimeout(handleSkip, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRemaining(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [ringStarted, remaining, handleSkip]);

  const isSemi = stage === 'toSemi';
  const title = isSemi ? '준결승 진출!' : '마지막 한 판!';

  const visibleArc = ringStarted ? 0 : ARC_CIRCUMFERENCE;
  const arcTransition = ringStarted ? `stroke-dasharray ${COUNTDOWN * 1000}ms linear` : 'none';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 cursor-pointer bg-bg-layer-overlay ${isExiting ? 'rs-dim-exit' : 'rs-dim'}`}
        aria-hidden
        onClick={handleSkip}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed bottom-0 left-1/2 z-50 w-full max-w-120 -translate-x-1/2 cursor-pointer overflow-hidden ${isExiting ? 'rs-sheet-exit' : 'rs-sheet'}`}
        style={{
          height: 540,
          borderRadius: '24px 24px 0 0',
          background: 'linear-gradient(180deg, #ECF8FE 0%, #FFF 50%)',
        }}
        onClick={handleSkip}
      >
        {/* Decorative semi-circle — dome visible in blue gradient area */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 15,
            left: 0,
            right: 0,
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            background: '#FFF',
          }}
        />

        {/* Content */}
        <div className="relative flex flex-col items-center px-5 pt-[31px] pb-5">
          {/* Countdown timer */}
          <div
            className="rs-ring relative flex items-center justify-center"
            style={{ width: ARC_SIZE, height: ARC_SIZE }}
          >
            <svg
              width={ARC_SIZE}
              height={ARC_SIZE}
              className="absolute -rotate-90"
              aria-label={`${remaining}초 후 다음 화면`}
            >
              <circle
                cx={ARC_SIZE / 2}
                cy={ARC_SIZE / 2}
                r={ARC_RADIUS}
                stroke="#E8EAF0"
                strokeWidth={ARC_STROKE}
                fill="none"
              />
              <circle
                cx={ARC_SIZE / 2}
                cy={ARC_SIZE / 2}
                r={ARC_RADIUS}
                stroke="var(--color-border-accent)"
                strokeWidth={ARC_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${visibleArc} ${ARC_CIRCUMFERENCE}`}
                style={{ transition: arcTransition }}
              />
            </svg>
            <span className="text-[20px] leading-7 font-bold tracking-[-0.6px] text-text-accent">
              {remaining}
            </span>
          </div>

          {/* Title + description */}
          <div className="mt-[10px] flex flex-col items-center gap-1">
            <h2 className="text-[20px] leading-7 font-bold tracking-[-0.6px] text-text-neutral-primary">
              {title}
            </h2>
            <p className="text-[16px] leading-[22px] font-semibold tracking-[-0.6px]">
              {isSemi ? (
                <>
                  <span className="text-text-accent">3번</span>
                  <span className="text-text-neutral-tertiary">의 선택만 남았어요.</span>
                </>
              ) : (
                <>
                  <span className="text-text-accent">최종</span>
                  <span className="text-text-neutral-tertiary"> 선택만 남았어요.</span>
                </>
              )}
            </p>
          </div>

          {/* Mini bracket */}
          <div className="mt-9">
            <MiniBracket stage={stage} />
          </div>
        </div>
      </div>
    </>
  );
}

export default RoundTransitionSheet;
