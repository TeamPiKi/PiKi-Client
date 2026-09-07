import { GoogleAnalytics } from '@next/third-parties/google';
import { isTokenUnexpired } from '@piki/core';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import React from 'react';

import { getMeQueryOptions } from '@/apis/getMe';
import BottomTabBar from '@/components/bottom-tab-bar';
import AppUpdateDialog from '@/components/common/app-update-dialog';
import InAppBrowserEscape from '@/components/common/in-app-browser-escape';
import { APP_UPDATE_PROMPT } from '@/consts/appUpdate';
import { SCROLL_CONTAINER_ID } from '@/consts/layout';
import { getAppVersion, isAppVersionSupported } from '@/utils/appVersion';
import { getLandingEnv, shouldEscapeInAppBrowser } from '@/utils/landingEnv';
import { getQueryClient } from '@/utils/queryClient';
import { isWebview as _isWebView } from '@/utils/webBridge';

import Providers from '../components/Providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'PiKi - 같이 고르는 쇼핑 토너먼트',
  description: '흩어진 위시를 한곳에 모아 토너먼트로 결정해보세요.',
};

/**
 * iOS 26 Safari 부터 `<meta name="theme-color">` 가 무시돼 노치/홈 인디케이터 영역이
 * body 배경색을 따른다. 이 영역까지 우리 콘텐츠가 칠해지도록 viewport-fit=cover 를 켜고,
 * 페이지에서는 `pt-padding-top` 으로 패딩을 잡는다.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // NOTE: 웹뷰 줌 방지용 — 일반 Safari 는 user-scalable=no 를 무시하므로 브라우저 확대 접근성은 유지된다.
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const userAgent = headerStore.get('user-agent') ?? '';
  const isWebview = _isWebView(userAgent);

  const queryClient = getQueryClient();
  const accessToken = (await cookies()).get('access_token')?.value;
  if (isTokenUnexpired(accessToken ?? null)) {
    queryClient.prefetchQuery(getMeQueryOptions);
  }

  const shouldUpdateApp =
    isWebview && !isAppVersionSupported(getAppVersion(userAgent), APP_UPDATE_PROMPT.targetVersion);

  /** 유저가 어떤 기기, 어떤 브라우저로 페이지에 도착했는지 UA 확인 */
  const landingEnv = getLandingEnv(userAgent);
  const shouldEscape = shouldEscapeInAppBrowser(landingEnv, isWebview);

  return (
    <html
      lang="ko"
      className="h-full overflow-hidden antialiased"
      {...(isWebview && { 'data-app': '' })}
    >
      <head>
        {/** Pretendard Dynamic Subset CSS */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />

        {process.env.NODE_ENV === 'development' && !isWebview && (
          <>
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <script
              src="https://unpkg.com/react-grab@0.1.29/dist/index.global.js"
              crossOrigin="anonymous"
            />
            <script
              src="https://unpkg.com/@react-grab/claude-code@0.1.29/dist/client.global.js"
              defer
            />
          </>
        )}
      </head>
      <body className="h-full overflow-hidden">
        <Providers>
          {/** TEMP: max width 임시 값 */}
          <div
            id={SCROLL_CONTAINER_ID}
            className="mx-auto hide-scrollbar h-full max-w-120 overflow-y-auto [scrollbar-gutter:stable]"
          >
            <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>
          </div>

          {/* NOTE: 전환 애니메이션이 끊기지 않게 하기 위해 탭바를 레이아웃에 렌더 */}
          <BottomTabBar />

          {shouldUpdateApp && <AppUpdateDialog />}
          {shouldEscape && <InAppBrowserEscape landingEnv={landingEnv} />}
        </Providers>
        {/**
         * GA4 web stream — 일반 브라우저 사용자 추적용.
         * 웹뷰(앱) 안에서는 native Firebase Analytics 가 따로 작동하므로 이중 집계를 피하려고 마운트 X.
         */}
        {!isWebview && process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}

export default RootLayout;
