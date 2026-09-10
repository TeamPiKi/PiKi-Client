'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { QUERY_ACTION, type QueryActionValueT } from '@/consts/queryAction';
import { QUERY_ACTION_TOAST } from '@/consts/queryActionToast';
import { clearQueryParam } from '@/utils/clearQueryParam';

/**
 * `?action=` 으로 넘어온 안내 토스트를 노출하고 쿼리를 URL 에서 제거한다.
 *
 * 도착지와 무관하게 동작하므로 루트에 한 번만 마운트한다.
 * 문구는 `QUERY_ACTION_TOAST` 가 단일 소스 — 새 안내는 이 파일을 고칠 필요가 없다.
 */
function QueryActionToast() {
  const searchParams = useSearchParams();

  const action = searchParams.get(QUERY_ACTION.KEY);
  const toastEntry = action ? QUERY_ACTION_TOAST[action as QueryActionValueT] : null;

  useEffect(() => {
    if (!toastEntry) return;

    toast[toastEntry.variant](toastEntry.message);
    /** action 만 걷어낸다 — 도착지가 함께 실어 보낸 쿼리(redirect·필터 등)까지 지우면 안 된다 */
    clearQueryParam(QUERY_ACTION.KEY);
  }, [toastEntry]);

  return null;
}

export default QueryActionToast;
