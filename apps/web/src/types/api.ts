import type { ApiErrorCodeT } from '@piki/core';

type PageResponseT = {
  nextCursor: string | null;
  hasNext: boolean;
};

// 공통 성공 응답 타입
export type ApiResponseT<T> = {
  data: T;
  code: null;
  pageResponse: PageResponseT;
};

// 공통 에러 응답 타입
export type ApiErrorResponseT<T = null> = {
  data: T;
  code: ApiErrorCodeT;
};
