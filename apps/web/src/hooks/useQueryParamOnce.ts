'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useQueryParamOnce = (paramKey: string) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  /** 진입 시점의 값만 필요하므로 초기화 함수에서 한 번만 읽는다 */
  const [value] = useState(() => searchParams.get(paramKey));

  useEffect(() => {
    if (searchParams.get(paramKey) === null) return;

    router.replace(pathname, { scroll: false });
  }, [searchParams, paramKey, pathname, router]);

  return value;
};
