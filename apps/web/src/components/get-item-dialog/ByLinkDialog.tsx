'use client';

import { ERROR_CODE } from '@piki/core';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { LinkIconFill } from '@/assets/icons';
import Button from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/dialog';
import Input from '@/components/input';
import { WISH_ENTRY_POINT } from '@/consts/api';
import { usePostTournamentItemLink } from '@/hooks/usePostTournamentItemLink';
import { usePostWishLink } from '@/hooks/usePostWishLink';
import type { ItemTypeT } from '@/types/item';
import { getApiErrorCode } from '@/utils/apiError';
import { URL_PATTERN, extractUrlFromText } from '@/utils/extractUrl';
import { isWebview } from '@/utils/webBridge';

type ByLinkProps = {
  type: ItemTypeT;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ByLinkDialog({ type, open, onOpenChange }: ByLinkProps) {
  const { id: tournamentId } = useParams<{ id: string }>();

  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { postWishLinkMutation, isPostWishLinkPending } = usePostWishLink(
    isWebview() ? WISH_ENTRY_POINT.IN_APP : WISH_ENTRY_POINT.IN_WEB,
    { onErrorMessage: setErrorMessage }
  );
  const { postTournamentItemLinkMutation, isPostTournamentItemLinkPending } =
    usePostTournamentItemLink(Number(tournamentId), { onErrorMessage: setErrorMessage });

  const trimmedUrl = url.trim();
  const isEmpty = trimmedUrl.length === 0;
  const isPending = isPostWishLinkPending || isPostTournamentItemLinkPending;

  const resetState = () => {
    setUrl('');
    setErrorMessage(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmpty) return;

    // 상품 설명과 URL 이 함께 붙여넣어진 경우 URL 만 추출해 제출한다 (onPaste 를 타지 않은 경로 안전망).
    const submitUrl = URL_PATTERN.test(trimmedUrl) ? trimmedUrl : extractUrlFromText(trimmedUrl);

    if (!submitUrl) {
      setErrorMessage('올바른 URL 형식으로 입력해주세요.');
      return;
    }

    if (!submitUrl.startsWith('https://')) {
      setErrorMessage('https 링크만 등록할 수 있어요');
      return;
    }

    const mutationOptions = {
      onSuccess: () => {
        onOpenChange(false);
        resetState();
      },
      onError: (error: Error) => {
        /** 중복 위시 등록인 경우 다이얼로그 닫음 */
        if (getApiErrorCode(error) === ERROR_CODE.WISH_ALREADY_EXISTS) {
          onOpenChange(false);
          resetState();
        }
      },
    };

    if (type === 'wish') postWishLinkMutation(submitUrl, mutationOptions);
    else postTournamentItemLinkMutation(submitUrl, mutationOptions);
  };

  const handleChange = (value: string) => {
    setUrl(value);
    if (errorMessage) setErrorMessage(null);
  };

  /** 상품 설명 + URL 형태로 붙여넣으면 URL 만 입력창에 반영한다 */
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const extractedUrl = extractUrlFromText(event.clipboardData.getData('text'));
    if (!extractedUrl) return;

    event.preventDefault();
    handleChange(extractedUrl);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="flex flex-col gap-5 rounded-3xl">
        <DialogTitle className="text-center heading-1-bold text-text-neutral-primary">
          링크로 담기
        </DialogTitle>
        <DialogDescription className="sr-only">상품 URL을 입력해 담습니다.</DialogDescription>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="링크 URL"
            placeholder="복사한 링크를 입력해주세요."
            value={url}
            onChange={event => handleChange(event.target.value)}
            onPaste={handlePaste}
            left={<LinkIconFill className="size-5" />}
            aria-invalid={Boolean(errorMessage)}
            {...(errorMessage ? { helperText: errorMessage } : {})}
            autoFocus
          />
          <Button
            type="submit"
            size="lg"
            variant="primary"
            disabled={isEmpty}
            isLoading={isPending}
          >
            {type === 'wish' && '위시리스트에 담기'}
            {type === 'tournament' && '후보 바구니에 담기'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ByLinkDialog;
