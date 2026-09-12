import PiKiLogo from '@/assets/images/piki-logo-text.svg';
import { Header, HeaderIcon } from '@/components/header';
import Spacing from '@/components/spacing';
import { getIsGuest } from '@/utils/auth';

import AddWishHomeDialog from './_components/AddWishHomeDialog';
import CreateTournamentDialog from './_components/CreateTournamentDialog';
import HomeGuestBannerClient from './_components/HomeGuestBannerClient';
import InviteTournamentDialog from './_components/InviteTournamentDialog';
import HomeOnboarding from './_components/home-onboarding';
import TournamentList from './_components/tournament-list';

async function HomePage() {
  const isGuest = await getIsGuest();

  return (
    <div className="to-bg-gray-50 relative flex min-h-dvh flex-col bg-linear-to-b from-bg-layer-default px-5 pt-padding-top pb-32">
      {/* 상단 헤더 */}
      <Header left={<PiKiLogo />} right={<HeaderIcon name="ALARM" />} />

      <Spacing size={isGuest ? 12 : 24} />

      {/* 메인 컨텐츠 */}
      <main className="flex w-full flex-1 flex-col gap-8">
        <div className="flex flex-col gap-3">
          {isGuest && <HomeGuestBannerClient />}
          <section className="grid grid-cols-2 gap-3">
            <AddWishHomeDialog />
            <CreateTournamentDialog />
            <InviteTournamentDialog />
          </section>
        </div>

        {/* 최근 생성한 토너먼트 */}
        <TournamentList isGuest={isGuest} />
      </main>

      <HomeOnboarding />
    </div>
  );
}

export default HomePage;
