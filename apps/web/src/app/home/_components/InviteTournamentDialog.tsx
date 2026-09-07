'use client';

import { ERROR_CODE } from '@piki/core';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getInvitePreviewByCode } from '@/apis/getInvitePreviewByCode';
import {
  CODE_LENGTH,
  isValidInviteCodeFormat,
} from '@/app/tournament/join/_utils/verifyInviteCode';
import { GroupIconFill } from '@/assets/icons';
import Button from '@/components/button';
import type { JoinErrorTypeT } from '@/components/common/join-error-dialog';
import JoinErrorDialog from '@/components/common/join-error-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/dialog';
import Input from '@/components/input';
import Spinner from '@/components/spinner';
import { ANALYTICS_EVENT } from '@/consts/analytics';
import { ROUTES } from '@/consts/route';
import { logAnalyticsEvent } from '@/utils/analytics';
import { getApiErrorCode, getApiErrorStatus, isGlobalNetError } from '@/utils/apiError';

function InviteTournamentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [showFormatError, setShowFormatError] = useState(false);
  const [joinErrorType, setJoinErrorType] = useState<JoinErrorTypeT | null>(null);

  const { mutate: previewMutation, isPending: isPreviewPending } = useMutation({
    mutationFn: getInvitePreviewByCode,
    /** mutation 진행 중 사용자가 input 을 바꿀 수 있으므로 검증에 사용한 variables 를 그대로 라우팅에 쓴다. */
    onSuccess: (data, enteredCode) => {
      setOpen(false);
      reset();
      router.push(`${ROUTES.TOURNAMENT_JOIN_BY_LINK(data.tournamentId)}?code=${enteredCode}`);
    },
    onError: error => {
      setOpen(false);
      reset();

      if (isGlobalNetError(error)) return;

      const apiErrorCode = getApiErrorCode(error);
      const apiStatus = getApiErrorStatus(error);

      /** 409(참여 불가): `TOURNAMENT-005`(이미 시작), `TOURNAMENT-021`(만료) 및 매핑되지 않은 409 는 만료 안내 */
      if (apiStatus === 409) {
        /** TODO: `TOURNAMENT-005` 가 진행 중·완료를 한 코드로 덮어 완료된 토너먼트에도 "이미 시작된" 안내가 나간다 — 서버에 코드 분리 요청 필요 */
        setJoinErrorType(
          getApiErrorCode(error) === ERROR_CODE.TOURNAMENT_NOT_PENDING
            ? 'ALREADY_STARTED'
            : 'LINK_EXPIRED'
        );
        return;
      }

      /** 삭제된 토너먼트인 경우 */
      if (apiErrorCode === ERROR_CODE.TOURNAMENT_NOT_FOUND) {
        setJoinErrorType('DELETED');
        return;
      }

      /** 그 외(400 코드 불일치 포함): 유효하지 않은 코드로 안내 */
      setJoinErrorType('INVALID_CODE');
    },
  });

  const isComplete = code.length === CODE_LENGTH;
  const canSubmit = isComplete && !isPreviewPending;

  const reset = () => {
    setCode('');
    setShowFormatError(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const handleTriggerClick = () => {
    logAnalyticsEvent(ANALYTICS_EVENT.SOCIAL_INVITE_CLICK);
  };

  const handleChange = (next: string) => {
    setCode(next.slice(0, CODE_LENGTH).toUpperCase());
    if (showFormatError) setShowFormatError(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (!isValidInviteCodeFormat(code)) {
      setShowFormatError(true);
      return;
    }

    previewMutation(code);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild onClick={handleTriggerClick}>
          <button
            type="button"
            aria-label="공유받은 토너먼트 참여하기"
            className="flex h-[104px] cursor-pointer flex-col rounded-2xl bg-gray-50 p-4"
          >
            <span className="text-left body-1-semibold whitespace-pre-line text-text-neutral-primary">
              {'공유받은 토너먼트\n참여하기'}
            </span>
            <GroupIconFill className="size-7.5 self-end text-icon-neutral-secondary" />
          </button>
        </DialogTrigger>
        <DialogContent showCloseButton={false} className="flex flex-col gap-5 p-6">
          <DialogTitle className="text-center heading-1-bold text-text-neutral-primary">
            공유받은 토너먼트
          </DialogTitle>
          <DialogDescription className="sr-only">초대 코드를 입력해 입장합니다.</DialogDescription>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="초대 코드"
              placeholder="pik123"
              value={code}
              onChange={event => handleChange(event.target.value)}
              aria-invalid={showFormatError}
              {...(showFormatError
                ? { helperText: '영문 대문자 3자 + 숫자 3자로 입력해주세요.' }
                : {})}
              maxLength={CODE_LENGTH}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />

            <Button type="submit" size="lg" variant="primary" disabled={!canSubmit}>
              {isPreviewPending ? <Spinner size={20} /> : '입장하기'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {joinErrorType && (
        <JoinErrorDialog type={joinErrorType} open onOpenChange={() => setJoinErrorType(null)} />
      )}
    </>
  );
}

export default InviteTournamentDialog;
