import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { isGlobalNetError } from '@/utils/apiError';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

import { patchTournamentNickname } from '../_apis/patchTournamentNickname';

export const usePatchTournamentNickname = () => {
  const { mutate: patchTournamentNicknameMutation, isPending: isPatchTournamentNicknamePending } =
    useMutation({
      mutationFn: patchTournamentNickname,
      onError: error => {
        if (isGlobalNetError(error)) return;

        toast.error(getApiErrorMessage(error));
      },
    });

  return { patchTournamentNicknameMutation, isPatchTournamentNicknamePending };
};
