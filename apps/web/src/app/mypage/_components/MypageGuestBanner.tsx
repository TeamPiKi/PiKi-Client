'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import BasketGuestIcon from '@/assets/images/basket-guest.svg';
import { buttonStyles } from '@/components/button/button.style';
import { ANALYTICS_EVENT } from '@/consts/analytics';
import { LOGIN_SOURCE } from '@/consts/loginSource';
import { ROUTES } from '@/consts/route';
import { logAnalyticsEvent } from '@/utils/analytics';
import { setLoginSource } from '@/utils/loginSource';
import { getLoginPath } from '@/utils/loginRedirect';

function MypageGuestBanner() {
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENT.GUEST_BANNER_VIEW, { location: LOGIN_SOURCE.MYPAGE });
  }, []);

  const handleLoginClick = () => {
    logAnalyticsEvent(ANALYTICS_EVENT.GUEST_BANNER_CTA_CLICK, { location: LOGIN_SOURCE.MYPAGE });
    /** 로그인·OAuth 를 거치며 location 이 사라지므로 가입 완료까지 들고 갈 유입 지점을 남긴다 */
    setLoginSource(LOGIN_SOURCE.MYPAGE);
  };

  return (
    <div className="flex items-center gap-3">
      <BasketGuestIcon className="size-[52px] shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="body-1-medium text-gray-900">3초면 가입 끝,</p>
        <p className="body-1-medium text-gray-900">지금 가입하고 위시 모아보기</p>
      </div>
      <Link
        href={getLoginPath(ROUTES.MYPAGE)}
        onClick={handleLoginClick}
        className={buttonStyles({ variant: 'secondary', size: 'sm' })}
      >
        로그인
      </Link>
    </div>
  );
}

export default MypageGuestBanner;
