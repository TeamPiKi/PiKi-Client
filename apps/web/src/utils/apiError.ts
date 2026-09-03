import { ERROR_CODE, S3_UPLOAD_ERROR_MESSAGE } from '@piki/core';
import type { ApiErrorCodeT } from '@piki/core';
import { isAxiosError } from 'axios';

import type { ApiErrorResponseT } from '@/types/api';

/** 탈퇴한 계정(409 USER-003) — 양쪽 인터셉터가 세션을 정리하고 로그인으로 보낸다 */
export const isWithdrawnAccountError = (error: unknown): boolean =>
  isAxiosError<ApiErrorResponseT>(error) &&
  error.response?.status === 409 &&
  error.response.data?.code === ERROR_CODE.USER_DELETED;

/** 5xx·네트워크(응답 없음) 오류 — 전역 안전망이 단독으로 토스트한다 */
export const isServerOrNetworkError = (error: unknown): boolean =>
  !isAxiosError(error) || !error.response || error.response.status >= 500;

/**
 * 전역 안전망이 덮는 에러 — 개별 `onError` 는 건드리지 않는다.
 *
 * 새로 전역이 가져가는 케이스가 생기면 여기만 고친다. (개별 훅에 조건이 흩어지면 누락 시 조용히 중복 처리된다)
 */
export const isGlobalNetError = (error: unknown): boolean =>
  isServerOrNetworkError(error) ||
  (isAxiosError(error) && error.response?.status === 401) ||
  isWithdrawnAccountError(error);

const S3_UPLOAD_ERROR_NAME = 'S3UploadError';
export const createS3UploadError = (cause: unknown) => {
  const error = new Error(S3_UPLOAD_ERROR_MESSAGE, { cause });
  error.name = S3_UPLOAD_ERROR_NAME;

  return error;
};

export const isS3UploadError = (error: unknown): error is Error =>
  error instanceof Error && error.name === S3_UPLOAD_ERROR_NAME;

export const getApiErrorStatus = (error: unknown): number | null =>
  isAxiosError(error) ? (error.response?.status ?? null) : null;

export const getApiErrorCode = (error: unknown): ApiErrorCodeT | null =>
  isAxiosError<ApiErrorResponseT>(error) ? (error.response?.data?.code ?? null) : null;

export const getApiErrorData = <T>(error: unknown): T | null =>
  isAxiosError<ApiErrorResponseT<T | null>>(error)
    ? (error.response?.data?.data ?? null)
    : null;
