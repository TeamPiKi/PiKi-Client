'use client';

import Image from 'next/image';
import { useState } from 'react';

import LoginRequired from '@/components/common/login-required';
import { LOGIN_REQUIRED_TITLE } from '@/components/common/login-required/loginRequired.const';
import { Dialog, DialogTrigger } from '@/components/dialog';
import GetItemDialogContent from '@/components/get-item-dialog';
import { ANALYTICS_EVENT } from '@/consts/analytics';
import { ROUTES } from '@/consts/route';
import { useGetMe } from '@/hooks/useGetMe';
import { logAnalyticsEvent } from '@/utils/analytics';

import AddWishBg from '../_assets/add-wish-bg.png';

const wishButtonClassName =
  'relative row-span-2 h-[220px] cursor-pointer overflow-hidden rounded-2xl bg-[#62c7ff]';

function AddWishHomeDialog() {
  const { userData } = useGetMe();
  const isGuest = userData.identityType !== 'MEMBER';
  const [isLoginRequiredOpen, setIsLoginRequiredOpen] = useState(false);

  const handleAddWishClick = () => {
    logAnalyticsEvent(ANALYTICS_EVENT.WISH_ADD_START);
  };

  /** 게스트 - 위시 담기 버튼 클릭 시 로그인 유도 UI 띄우기 */
  if (isGuest) {
    const handleGuestAddWishClick = () => {
      handleAddWishClick();
      setIsLoginRequiredOpen(true);
    };

    return (
      <>
        <button type="button" onClick={handleGuestAddWishClick} className={wishButtonClassName}>
          <WishButtonContent />
        </button>
        {isLoginRequiredOpen && (
          <div className="absolute inset-0 z-50">
            <LoginRequired
              title={LOGIN_REQUIRED_TITLE.WISH}
              redirectPath={ROUTES.WISHLIST}
              onGoHome={() => setIsLoginRequiredOpen(false)}
            />
          </div>
        )}
      </>
    );
  }

  /** 멤버 - 위시 담기 버튼 클릭 시 위시 담기 모달 띄우기 */
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" onClick={handleAddWishClick} className={wishButtonClassName}>
          <WishButtonContent />
        </button>
      </DialogTrigger>

      <GetItemDialogContent type="wish" />
    </Dialog>
  );
}

function WishButtonContent() {
  return (
    <>
      <Image
        src={AddWishBg}
        alt=""
        aria-hidden
        width={525}
        height={660}
        sizes="(max-width: 640px) 40vw, 175px"
        className="pointer-events-none absolute top-0 left-1/2 h-full w-auto -translate-x-1/2"
        priority
      />
      <span className="absolute top-[18px] left-[15px] heading-1-bold text-base-50">위시 담기</span>
    </>
  );
}

export default AddWishHomeDialog;
