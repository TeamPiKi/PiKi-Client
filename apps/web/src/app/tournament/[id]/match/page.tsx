import { ERROR_CODE } from '@piki/core';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { redirect } from 'next/navigation';

import { ITEM_STATUS } from '@/consts/item';
import { QUERY_ACTION } from '@/consts/queryAction';
import { ROUTES } from '@/consts/route';
import { MIN_TOURNAMENT_ITEM_COUNT, TOURNAMENT_STATUS } from '@/consts/tournament';
import { getApiErrorCode, getApiErrorStatus } from '@/utils/apiError';
import { hasParsingItems } from '@/utils/item';
import { getQueryClient } from '@/utils/queryClient';

import { getTournament } from '../_common/_apis/getTournament';
import type {
  GetTournamentInProgressResponseT,
  PendingTournamentItemT,
} from '../_common/_types/tournamentResponse';
import { postStartTournament } from './_apis/postStartTournament';
import TournamentClient from './_components/TournamentClient';

type TournamentPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 서버가 시작을 거부하는 사유 — 에러 화면 대신 대기실로 돌려보낸다.
 * status 까지 함께 보는 이유: code 만 비교하면 401·5xx 가 같은 code 를 실어 보낼 때
 * 전역 에러 처리를 가로채 버린다.
 */
const NOT_STARTABLE_ERRORS: { status: number; codes: string[] }[] = [
  { status: 400, codes: [ERROR_CODE.TOURNAMENT_INVALID_ITEM_COUNT] },
  {
    status: 409,
    codes: [
      ERROR_CODE.TOURNAMENT_ITEM_NOT_READY_TO_START,
      ERROR_CODE.TOURNAMENT_ITEM_PRICE_REQUIRED,
      ERROR_CODE.TOURNAMENT_ITEM_INCOMPLETE,
    ],
  },
];

const isNotStartableError = (error: unknown) => {
  const status = getApiErrorStatus(error);
  const code = getApiErrorCode(error);
  if (status === null || code === null) return false;

  return NOT_STARTABLE_ERRORS.some(entry => entry.status === status && entry.codes.includes(code));
};

const notStartablePath = (tournamentId: number) =>
  `${ROUTES.TOURNAMENT_CREATE(tournamentId)}?${QUERY_ACTION.KEY}=${QUERY_ACTION.VALUE.TOURNAMENT_NOT_STARTABLE}`;

/** 대기실 시작 버튼(hasPendingItem · hasUnfinishedItem)과 동일한 기준 */
const isStartable = (items: PendingTournamentItemT[]) =>
  items.length >= MIN_TOURNAMENT_ITEM_COUNT &&
  !hasParsingItems(items) &&
  !items.some(item => item.status === ITEM_STATUS.FAILED || item.status === ITEM_STATUS.INCOMPLETE);

async function TournamentPage({ params }: TournamentPageProps) {
  const { id } = await params;
  const tournamentId = Number(id);

  const tournamentData = await getTournament(tournamentId);

  if (tournamentData.status === TOURNAMENT_STATUS.COMPLETED) {
    redirect(ROUTES.TOURNAMENT_RESULT(tournamentId));
  }

  // 참여자가 본인 매치를 시작하기 전 (IN_PROGRESS + pending 페이로드)
  // — 아직 진행할 게 없으므로 create(대기) 화면으로 돌려보낸다.
  if (tournamentData.status === TOURNAMENT_STATUS.IN_PROGRESS && tournamentData.pending) {
    redirect(ROUTES.TOURNAMENT_CREATE(tournamentId));
  }

  let hydratedTournament: GetTournamentInProgressResponseT;
  let playTournamentId = tournamentId;

  if (tournamentData.status === TOURNAMENT_STATUS.PENDING) {
    // 대기실 시작 버튼과 같은 기준으로 미리 거른다 — 그냥 start 를 부르면
    // 서버가 400(TOURNAMENT-007) 을 주고 전역 에러 화면으로 떨어진다.
    if (!isStartable(tournamentData.pending?.items ?? [])) {
      redirect(notStartablePath(tournamentId));
    }

    try {
      // 응답 tournamentId 활용:
      // - 주최자(ROOT): 요청 tournamentId 와 동일
      // - 참여자(CLONE): 새로 생성된 CLONE id (이후 본인 인스턴스로 진행)
      const { tournamentId: nextTournamentId } = await postStartTournament(tournamentId);

      // CLONE 이 생성됐다면 본인 인스턴스 URL 로 이동 (재진입 시 IN_PROGRESS 분기로 흘러감)
      if (nextTournamentId !== tournamentId) {
        redirect(ROUTES.TOURNAMENT_MATCH(nextTournamentId));
      }

      // start 응답에는 브래킷(currentMatch)이 없어 서버 권위 상태를 다시 받는다.
      // RSC 내부 왕복이라 브라우저 지연이 아니고, 아래 409 복구 경로와 같은 패턴이다.
      playTournamentId = nextTournamentId;
      const started = await getTournament(nextTournamentId);

      if (started.status === TOURNAMENT_STATUS.COMPLETED) {
        redirect(ROUTES.TOURNAMENT_RESULT(nextTournamentId));
      }
      if (started.status !== TOURNAMENT_STATUS.IN_PROGRESS || started.pending) {
        // start 직후인데 진행 상태가 아님 — 예상 밖이라 대기 화면으로 돌려보낸다
        redirect(ROUTES.TOURNAMENT_CREATE(nextTournamentId));
      }

      hydratedTournament = started;
    } catch (error) {
      if (!isAxiosError(error)) throw error;

      // 사전 검사를 통과했더라도 그 사이 상태가 바뀔 수 있다.
      // 시작 불가 사유는 에러 화면 대신 대기실로 돌려보낸다.
      if (isNotStartableError(error)) {
        redirect(notStartablePath(tournamentId));
      }

      // 409: 다른 탭/요청이 먼저 start 호출한 경우 — 서버 권위 상태로 복구
      if (error.response?.status !== 409) throw error;

      const latest = await getTournament(tournamentId);
      if (latest.status === TOURNAMENT_STATUS.COMPLETED) {
        redirect(ROUTES.TOURNAMENT_RESULT(tournamentId));
      }
      if (latest.status === TOURNAMENT_STATUS.PENDING || latest.pending) {
        // 409이면서 여전히 PENDING 또는 멤버 대기 상태 — 예상 밖, 그대로 던짐
        throw error;
      }
      hydratedTournament = latest;
    }
  } else {
    // tournamentData.status === TOURNAMENT_STATUS.IN_PROGRESS && !tournamentData.pending — 매치 진행 중
    hydratedTournament = tournamentData;
  }

  const queryClient = getQueryClient();
  queryClient.setQueryData(['tournament', playTournamentId], hydratedTournament);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TournamentClient
        tournamentId={playTournamentId}
        tournamentName={hydratedTournament.name}
        inProgress={hydratedTournament.inProgress}
      />
    </HydrationBoundary>
  );
}

export default TournamentPage;
