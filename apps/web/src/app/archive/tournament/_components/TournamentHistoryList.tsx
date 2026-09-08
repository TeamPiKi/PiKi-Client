'use client';

import TournamentEmptyState from '@/components/common/tournament-empty-state';
import TournamentCard from '@/components/tournament-card';
import { useGetTournamentList } from '@/hooks/useGetTournamentList';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import type { TournamentPlayTypeT, TournamentStatusT } from '@/types/tournament';
import { SCROLL_NAMESPACE } from '@/utils/scrollRestoration';

import type { TournamentStatusTabT } from '../_consts/tournamentTab';

type Props = {
  statuses: TournamentStatusT[];
  playType?: TournamentPlayTypeT;
  statusTab: TournamentStatusTabT;
};

function TournamentHistoryList({ statuses, playType, statusTab }: Props) {
  const { tournamentListData } = useGetTournamentList({ status: statuses, playType });

  useScrollRestoration({ namespace: SCROLL_NAMESPACE.ARCHIVE_TOURNAMENT, scope: statusTab });

  if (tournamentListData.length === 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center pb-24">
        <TournamentEmptyState />
      </div>
    );

  return (
    <>
      {tournamentListData.map(tournament => (
        <TournamentCard
          key={tournament.tournamentId}
          imageUrls={tournament.thumbnailUrls}
          tournamentId={tournament.tournamentId}
          status={tournament.status}
          name={tournament.name}
          participantCount={tournament.participantCount}
          playerCount={tournament.playerCount}
          scrollRestoration={{ namespace: SCROLL_NAMESPACE.ARCHIVE_TOURNAMENT, scope: statusTab }}
        />
      ))}
    </>
  );
}

export default TournamentHistoryList;
