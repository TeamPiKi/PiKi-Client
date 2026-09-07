'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { BasketIconFill } from '@/assets/icons';
import Button from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/dialog';
import Input from '@/components/input';
import { TOOLTIP_VARIANT_KEY } from '@/consts/abTest';
import { ANALYTICS_EVENT } from '@/consts/analytics';
import { usePostCreateTournament } from '@/hooks/usePostCreateTournament';
import {
  getAbVariantServerSnapshot,
  getOrAssignAbVariant,
  subscribeAbVariant,
} from '@/utils/abTest';
import { logAnalyticsEvent, setAnalyticsUserProperties } from '@/utils/analytics';

import TooltipAb from './tooltip-ab';

/** 토너먼트 생성 시 기본 초대 마감 시각 — 현재 + 30분. */
const DEFAULT_INVITE_DURATION_MINUTES = 30;

const getTooltipVariant = () => getOrAssignAbVariant(TOOLTIP_VARIANT_KEY);

function CreateTournamentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const { postCreateTournamentMutation, isPostCreateTournamentPending } = usePostCreateTournament();

  /**
   * A/B 그룹은 localStorage 에 있어 서버 렌더에서는 알 수 없다.
   * 서버 스냅샷을 `null` 로 두어 hydration 이후에 정해지고, 그 전에는 툴팁을 렌더하지 않아
   * A→B 로 바뀌는 깜빡임을 막는다.
   */
  const variant = useSyncExternalStore(
    subscribeAbVariant,
    getTooltipVariant,
    getAbVariantServerSnapshot
  );

  /** 홈 진입 1회만 — 클릭률의 분모가 되므로 중복 집계되면 안 된다 */
  const hasLoggedViewRef = useRef(false);

  useEffect(() => {
    if (!variant || hasLoggedViewRef.current) return;
    hasLoggedViewRef.current = true;

    setAnalyticsUserProperties({ tooltip_variant: variant });
    logAnalyticsEvent(ANALYTICS_EVENT.HOME_VIEW, { tooltip_variant: variant });
  }, [variant]);

  const handleTriggerClick = () => {
    logAnalyticsEvent(ANALYTICS_EVENT.NEW_TOURNAMENT_CLICK, {
      ...(variant && { tooltip_variant: variant }),
    });
  };

  const trimmedName = name.trim();
  const isDisabled = trimmedName.length === 0 || isPostCreateTournamentPending;

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDisabled) return;
    postCreateTournamentMutation(
      { name: trimmedName, inviteDurationMinutes: DEFAULT_INVITE_DURATION_MINUTES },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="새 토너먼트 만들기"
          onClick={handleTriggerClick}
          className="relative flex h-[104px] cursor-pointer flex-col rounded-2xl bg-gray-900 p-4"
        >
          {variant && <TooltipAb variant={variant} />}
          <span className="text-left body-1-semibold whitespace-pre-line text-base-50">
            {'새 토너먼트\n만들기'}
          </span>
          <BasketIconFill className="size-7.5 self-end text-white" />
        </button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="flex flex-col gap-5">
        <DialogDescription className="sr-only">새 토너먼트 생성 다이얼로그</DialogDescription>
        <DialogTitle className="text-center heading-1-bold text-text-neutral-primary">
          새 토너먼트
        </DialogTitle>
        <form onSubmit={handleCreate} className="flex flex-col gap-[15px]">
          <Input
            label="토너먼트 이름"
            placeholder="이번주 신발 고르기"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            maxLength={30}
          />
          <Button type="submit" size="lg" variant="primary" disabled={isDisabled}>
            생성하기
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateTournamentDialog;
