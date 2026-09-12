'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { clearQueryParam } from '@/utils/clearQueryParam';

export const useQueryParamOnce = (paramKey: string) => {
  const searchParams = useSearchParams();

  /** 진입 시점의 값만 필요하므로 초기화 함수에서 한 번만 읽는다 */
  const [value] = useState(() => searchParams.get(paramKey));

  useEffect(() => {
    if (searchParams.get(paramKey) === null) return;

    clearQueryParam(paramKey);
  }, [searchParams, paramKey]);

  return value;
};
