'use client';

import TournamentEmptyState from '@/components/common/tournament-empty-state';
import TournamentCard from '@/components/tournament-card';
import { useGetTournamentList } from '@/hooks/useGetTournamentList';

import TournamentGuestEmptyState from './TournamentGuestEmptyState';

type TournamentListClientProps = {
  isGuest?: boolean;
};

function TournamentListClient({ isGuest = false }: TournamentListClientProps) {
  const { tournamentListData } = useGetTournamentList({ limit: 3 });

  if (tournamentListData.length === 0) {
    if (isGuest) return <TournamentGuestEmptyState />;

    return (
      <div className="flex flex-1 items-center justify-center">
        <TournamentEmptyState variant="muted" />
      </div>
    );
  }

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
          playedCount={tournament.playedCount}
          showMorePopover={false}
        />
      ))}
    </>
  );
}

export default TournamentListClient;
