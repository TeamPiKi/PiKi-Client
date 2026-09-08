import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { ApiResponseT } from '@/types/api';

import type { PatchTournamentNicknameRequestT } from '../_types/join';

type PatchTournamentNicknameParamsT = {
  tournamentId: number;
  body: PatchTournamentNicknameRequestT;
};

export const patchTournamentNickname = async ({
  tournamentId,
  body,
}: PatchTournamentNicknameParamsT) => {
  const { data } = await clientApi.patch<ApiResponseT<null>>(
    ENDPOINTS.TOURNAMENT_NICKNAME(tournamentId),
    body
  );

  return data.data;
};
