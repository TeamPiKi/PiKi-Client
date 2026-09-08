'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useQueryParamOnce = (paramKey: string) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  /** 진입 시점의 값만 필요하므로 초기화 함수에서 한 번만 읽는다 */
  const [value] = useState(() => searchParams.get(paramKey));

  /** 도착지가 함께 실어 보낸 다른 쿼리까지 지우면 안 된다 */
  const restParams = new URLSearchParams(searchParams.toString());
  restParams.delete(paramKey);
  const rest = restParams.toString();
  const nextUrl = rest ? `${pathname}?${rest}` : pathname;

  useEffect(() => {
    if (searchParams.get(paramKey) === null) return;

    router.replace(nextUrl, { scroll: false });
  }, [searchParams, paramKey, nextUrl, router]);

  return value;
};
