'use client';

import {
  type ShareIntentPayloadT,
  WEBBRIDGE_MESSAGE_TYPE,
  WEB_REQ_READY_PAYLOAD_TYPE,
} from '@piki/core';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { usePostWishLink } from '@/hooks/usePostWishLink';
import { useWebBridgeMessage } from '@/hooks/useWebBridgeMessage';
import { URL_PATTERN, extractUrlFromText } from '@/utils/extractUrl';
import { WebBridge, isWebview } from '@/utils/webBridge';

const getUrlFromShareIntent = (payload: ShareIntentPayloadT): string | null => {
  if (payload.webUrl) {
    const trimmedWebUrl = payload.webUrl.trim();
    // 단일 URL 이면 그대로, 설명 텍스트가 섞여 있으면 URL 만 추출
    if (URL_PATTERN.test(trimmedWebUrl)) return trimmedWebUrl;
    const extractedFromWebUrl = extractUrlFromText(trimmedWebUrl);
    if (extractedFromWebUrl) return extractedFromWebUrl;
  }

  if (payload.text) return extractUrlFromText(payload.text);

  return null;
};

/** 앱 공유(ShareIntent)로 전달된 상품 URL을 위시리스트에 등록 */
export const useShareIntentWish = () => {
  /** 같은 URL의 중복 전달만 방지 — 후속 공유는 계속 처리돼야 한다 */
  const processedUrlsRef = useRef(new Set<string>());

  const { postWishLinkMutation } = usePostWishLink({ isExternalShare: true });

  const handleShareIntent = useCallback(
    (payload: ShareIntentPayloadT) => {
      const url = getUrlFromShareIntent(payload);
      if (!url) {
        toast.error('공유된 링크를 찾을 수 없어요');
        return;
      }

      if (processedUrlsRef.current.has(url)) return;

      processedUrlsRef.current.add(url);
      /** 처리 완료 후 잠금 해제 — in-flight 중복만 차단하고 재공유는 허용 */
      postWishLinkMutation(url, {
        onSettled: () => processedUrlsRef.current.delete(url),
      });
    },
    [postWishLinkMutation]
  );

  /** RN에 share intent 수신 준비 완료 알림 */
  useEffect(() => {
    if (!isWebview()) return;

    WebBridge.postMessage({
      type: WEBBRIDGE_MESSAGE_TYPE.WEB_REQ_READY,
      payload: {
        type: WEB_REQ_READY_PAYLOAD_TYPE.SHARE_INTENT,
      },
    });
  }, []);

  useWebBridgeMessage(
    useCallback(
      message => {
        if (message.type === WEBBRIDGE_MESSAGE_TYPE.APP_RES_SHARE_INTENT)
          handleShareIntent(message.payload);
      },
      [handleShareIntent]
    )
  );
};
