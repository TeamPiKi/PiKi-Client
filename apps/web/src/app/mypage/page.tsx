import { Header, HeaderIcon } from '@/components/header';
import Spacing from '@/components/spacing';
import { getIsGuest } from '@/utils/auth';

import AccountInfoSection from './_components/AccountInfoSection';
import AppVersionFooter from './_components/AppVersionFooter';
import MypageGuestBanner from './_components/MypageGuestBanner';
import ProfileSection from './_components/ProfileSection';

async function MypagePage() {
  const isGuest = await getIsGuest();

  return (
    <main className="flex h-dvh flex-col bg-bg-layer-basement px-5 pt-padding-top">
      <Header left={<HeaderIcon name="BACK" />} center={<h1 className="heading-1-bold">마이</h1>} />
      <Spacing size={56} />

      <div className="hide-scrollbar flex flex-1 flex-col overflow-y-auto pb-32">
        {isGuest && (
          <>
            <MypageGuestBanner />
            <Spacing size={20} />
          </>
        )}

        <ProfileSection />

        <Spacing size={32} />

        <AccountInfoSection />

        <Spacing size={24} />

        <AppVersionFooter />
      </div>
    </main>
  );
}

export default MypagePage;
