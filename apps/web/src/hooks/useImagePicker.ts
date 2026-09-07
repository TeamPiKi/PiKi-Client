'use client';

import { type ImagePickerSuccessPayloadT, WEBBRIDGE_MESSAGE_TYPE } from '@piki/core';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useWebBridgeMessage } from '@/hooks/useWebBridgeMessage';
import { nativeImageToFile } from '@/utils/handleImage';
import { WebBridge, isWebview } from '@/utils/webBridge';

const DEFAULT_MAX_COUNT = 5;

const MAX_IMAGE_FILE_SIZE_MB = 5;
const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

type ImagePickerResultT = {
  files: File[];
  skippedCount: number;
};

type PendingRequestT = {
  resolve: (result: ImagePickerResultT) => void;
  reject: (error: Error) => void;
};

type UseImagePickerProps = {
  maxCount?: number;
  onSuccess: (files: File[], skippedCount: number) => void | Promise<void>;
  onCancel?: () => void;
  onError?: (error: Error) => void;
};

/**
 * 웹 / 웹뷰 환경에서 이미지 선택을 처리하는 훅
 *
 * @param maxCount - 최대 선택 가능한 이미지 개수
 * @param onSuccess - 이미지 선택 성공 시 호출되는 콜백 함수
 * @param onCancel - 이미지 선택 취소 시 호출되는 콜백 함수
 * @param onError - 이미지 선택 오류 시 호출되는 콜백 함수
 */
export const useImagePicker = ({
  maxCount = DEFAULT_MAX_COUNT,
  onSuccess,
  onCancel,
  onError,
}: UseImagePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  /** 웹뷰 비동기 응답을 requestId로 매칭 */
  const pendingRequestsRef = useRef<Map<string, PendingRequestT>>(new Map());

  /** 이미지 선택 중인 상태 */
  const [isPending, setIsPending] = useState(false);

  const handleImagesSelect = useCallback(
    async ({ files, skippedCount }: ImagePickerResultT) => {
      // 한도 초과 파일은 처리 전에 거른다 (웹/웹뷰 공통 경로).
      const validFiles = files.filter(file => file.size <= MAX_IMAGE_FILE_SIZE_BYTES);
      const oversizedCount = files.length - validFiles.length;
      if (oversizedCount > 0) {
        toast.error(`${MAX_IMAGE_FILE_SIZE_MB}MB 이하 이미지만 업로드할 수 있어요.`);
      }
      if (validFiles.length === 0) return;

      setIsPending(true);
      try {
        await onSuccess(validFiles, skippedCount);
      } catch (error) {
        const pickError =
          error instanceof Error ? error : new Error('이미지 처리 중 오류가 발생했습니다.');
        onError?.(pickError);
      } finally {
        setIsPending(false);
      }
    },
    [onSuccess, onError]
  );

  const rejectPendingRequest = useCallback((requestId: string, error: Error) => {
    const pending = pendingRequestsRef.current.get(requestId);
    if (!pending) return;

    pendingRequestsRef.current.delete(requestId);
    pending.reject(error);
  }, []);

  /** 앱 → 웹 이미지 피커 응답 수신 */
  useWebBridgeMessage(message => {
    if (message.type === WEBBRIDGE_MESSAGE_TYPE.APP_RES_IMAGE_PICKER_SUCCESS) {
      const pending = pendingRequestsRef.current.get(message.payload.requestId);
      if (!pending) return;

      pendingRequestsRef.current.delete(message.payload.requestId);
      pending.resolve({
        files: message.payload.images.map(nativeImageToFile),
        skippedCount: getSkippedCount(message.payload),
      });
      return;
    }

    if (message.type === WEBBRIDGE_MESSAGE_TYPE.APP_RES_IMAGE_PICKER_CANCEL) {
      rejectPendingRequest(message.payload.requestId, new Error('IMAGE_PICKER_CANCELLED'));
      onCancel?.();
      return;
    }

    if (message.type === WEBBRIDGE_MESSAGE_TYPE.APP_RES_IMAGE_PICKER_ERROR) {
      rejectPendingRequest(
        message.payload.requestId,
        new Error(message.payload.detail || '이미지 선택 중 오류가 발생했습니다.')
      );
    }
  });

  useEffect(
    () => () => {
      pendingRequestsRef.current.forEach(pending => {
        pending.reject(new Error('IMAGE_PICKER_UNMOUNTED'));
      });
      pendingRequestsRef.current.clear();
    },
    []
  );

  /** 웹뷰: 앱에 피커 오픈 요청 후 Base64 응답 대기 */
  const openNativePicker = useCallback(() => {
    const requestId = crypto.randomUUID();

    const pendingPromise = new Promise<ImagePickerResultT>((resolve, reject) => {
      pendingRequestsRef.current.set(requestId, { resolve, reject });
    });

    setIsPending(true);

    const isSent = WebBridge.postMessage({
      type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_OPEN_IMAGE_PICKER,
      payload: { requestId, maxCount },
    });

    /** 앱 버전 게이트로 메시지가 보내지지 않은 경우  */
    if (!isSent) {
      pendingRequestsRef.current.delete(requestId);
      setIsPending(false);
      return;
    }

    void pendingPromise
      .then(async files => {
        await handleImagesSelect(files);
      })
      .catch(error => {
        if (
          error instanceof Error &&
          (error.message === 'IMAGE_PICKER_CANCELLED' ||
            error.message === 'IMAGE_PICKER_RESET' ||
            error.message === 'IMAGE_PICKER_UNMOUNTED')
        )
          return;

        const pickError =
          error instanceof Error ? error : new Error('이미지 선택 중 오류가 발생했습니다.');
        onError?.(pickError);
      })
      .finally(() => {
        setIsPending(false);
      });
  }, [maxCount, handleImagesSelect, onError]);

  /** 이미지 첨부 피커 열기 */
  const openPicker = useCallback(() => {
    if (isWebview()) {
      openNativePicker();
      return;
    }

    inputRef.current?.click();
  }, [openNativePicker]);

  /** 웹에서 이미지 첨부 시 */
  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []).slice(0, maxCount);
      event.target.value = '';

      if (files.length === 0) return;

      void handleImagesSelect({ files, skippedCount: 0 });
    },
    [maxCount, handleImagesSelect]
  );

  const resetImagePicker = useCallback(() => {
    pendingRequestsRef.current.forEach(pending => {
      pending.reject(new Error('IMAGE_PICKER_RESET'));
    });
    pendingRequestsRef.current.clear();
    setIsPending(false);
  }, []);

  return {
    openPicker,
    isPending,
    inputRef,
    handleInputChange,
    resetImagePicker,
  };
};

const getSkippedCount = (payload: ImagePickerSuccessPayloadT) => payload.skippedCount;
