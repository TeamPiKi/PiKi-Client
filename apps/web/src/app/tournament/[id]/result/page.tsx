import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import { ROUTES } from '@/consts/route';
import { TOURNAMENT_STATUS } from '@/consts/tournament';
import { getIsGuest } from '@/utils/auth';
import { getIsApp } from '@/utils/getIsApp';
import { getQueryClient } from '@/utils/queryClient';

import { getTournament } from '../_common/_apis/getTournament';
import ResultClient from './_components/ResultClient';

type TournamentResultPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 데이터를 기다리는 부분은 page 가 아닌 이 async 자식에 둔다.
 * page 자체가 await 하면 layout 의 Suspense 경계 바깥에서 블로킹돼
 * 결승 직후 내비게이션이 커밋되지 않는다.
 */
async function ResultContent({ tournamentId }: { tournamentId: number }) {
  const queryClient = getQueryClient();

  // 상위 layout 이 이미 같은 요청 안에서 조회해 캐시에 심어둔다(서버 QueryClient 는 요청 단위 공유).
  // ensureQueryData 로 그 값을 재사용해 결과 진입 시 중복 HTTP 요청을 없앤다.
  const tournamentData = await queryClient.ensureQueryData({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournament(tournamentId),
  });

  if (tournamentData.status !== TOURNAMENT_STATUS.COMPLETED) {
    redirect(ROUTES.TOURNAMENT_MATCH(tournamentId));
  }

  const [isGuest, isApp] = await Promise.all([getIsGuest(), getIsApp()]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ResultClient tournamentId={tournamentId} isGuest={isGuest} isApp={isApp} />
    </HydrationBoundary>
  );
}

async function TournamentResultPage({ params }: TournamentResultPageProps) {
  const { id } = await params;

  return <ResultContent tournamentId={Number(id)} />;
}

export default TournamentResultPage;
