import type {
  GetTournamentCompletedResponseT,
  GetTournamentInProgressResponseT,
  GetTournamentPendingResponseT,
  PendingTournamentItemT,
  TournamentMatchT,
} from '@/app/tournament/[id]/_common/_types/tournamentResponse';
import type {
  GetTournamentListResponseT,
  TournamentItemT,
  TournamentRankingT,
} from '@/types/tournament';

import { MOCK_IMAGE_URLS } from './images';

export const MOCK_TOURNAMENT_LIST: GetTournamentListResponseT = [
  {
    tournamentId: 1,
    name: 'E2E 토너먼트',
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00Z',
    participantCount: 1,
    playedCount: 0,
    thumbnailUrls: [],
  },
];

/**
 * 토너먼트 후보 아이템 4개 — 가격 오름차순, 전부 READY.
 * itemId 는 위시 목(mocks/wish.ts)의 item.id 와 매핑된다.
 */
export const MOCK_TOURNAMENT_ITEMS: (TournamentItemT & { itemId: number })[] = [
  {
    tournamentItemId: 11,
    itemId: 101,
    name: 'E2E 스니커즈',
    price: 10000,
    currency: 'KRW',
    imageUrl: MOCK_IMAGE_URLS.product,
    status: 'READY',
  },
  {
    tournamentItemId: 12,
    itemId: 102,
    name: 'E2E 백팩',
    price: 20000,
    currency: 'KRW',
    imageUrl: MOCK_IMAGE_URLS.product,
    status: 'READY',
  },
  {
    tournamentItemId: 13,
    itemId: 103,
    name: 'E2E 모자',
    price: 30000,
    currency: 'KRW',
    imageUrl: MOCK_IMAGE_URLS.product,
    status: 'READY',
  },
  {
    tournamentItemId: 14,
    itemId: 104,
    name: 'E2E 선글라스',
    price: 40000,
    currency: 'KRW',
    imageUrl: MOCK_IMAGE_URLS.product,
    status: 'READY',
  },
];

export const MOCK_TOURNAMENT_PENDING: GetTournamentPendingResponseT = {
  tournamentId: 1,
  name: 'E2E 토너먼트',
  isOwner: true,
  isRoot: true,
  status: 'PENDING',
  pending: {
    ownerStarted: false,
    inviteCode: 'E2ECODE',
    /** 미래 시각으로 고정해 초대 만료 카운트다운이 항상 유효하도록 */
    inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    /** status 가 PENDING/PROCESSING 인 아이템을 두지 않아 SSE 폴백 폴링이 돌지 않게 함 */
    items: [],
    participants: [
      {
        userId: 'e2e-guest-id',
        nickname: '피키게스트',
        itemCount: 0,
        profileImage: MOCK_IMAGE_URLS.avatar,
        isHost: true,
      },
    ],
  },
};

/**
 * 담긴 아이템 수만 다른 PENDING 변형 생성.
 * userId 는 넣지 않는다 — 친구 아이템 뱃지 로직(TournamentBasketItem)을 태우지 않기 위함.
 *
 * 클라이언트 조회는 staleTime(60초) 동안 레이아웃의 SSR 시드를 그대로 쓰기 때문에,
 * 브라우저 목만으로는 담긴 개수를 바꿀 수 없다 → 개수 변형마다 토너먼트 id 를 분리해
 * SSR 목(mockApiServer)에 함께 등록한다.
 */
const createPendingTournament = (
  tournamentId: number,
  itemCount: number
): GetTournamentPendingResponseT => {
  const items: PendingTournamentItemT[] = MOCK_TOURNAMENT_ITEMS.slice(0, itemCount);
  return {
    ...MOCK_TOURNAMENT_PENDING,
    tournamentId,
    pending: {
      ...MOCK_TOURNAMENT_PENDING.pending,
      items,
      participants: MOCK_TOURNAMENT_PENDING.pending.participants.map(participant => ({
        ...participant,
        itemCount,
      })),
    },
  };
};

/** 시작 버튼 비활성 가드용 — 후보 2개 미만 (id 11) */
export const MOCK_TOURNAMENT_PENDING_1ITEM = createPendingTournament(11, 1);
/** 부전승 안내 모달 가드용 — 2의 거듭제곱이 아닌 후보 수 (id 13) */
export const MOCK_TOURNAMENT_PENDING_3ITEMS = createPendingTournament(13, 3);
/** 시작 성공 플로우용 — 후보 4개 (id 14) */
export const MOCK_TOURNAMENT_PENDING_4ITEMS = createPendingTournament(14, 4);
/** by-wish 담기 완료 후 재조회(invalidate) 응답용 — 후보 4개 (id 1) */
export const MOCK_TOURNAMENT_PENDING_WITH_ITEMS = createPendingTournament(1, 4);

/**
 * 매치 진행 spec 전용 토너먼트 (id 2).
 * SSR 목 응답은 실행 내내 고정이라 상태 전이(PENDING→IN_PROGRESS→COMPLETED)를
 * 한 id 로 표현할 수 없어, 단계별로 토너먼트 id 를 분리한다 (1=PENDING, 2=IN_PROGRESS, 3=COMPLETED).
 */
const findItem = (tournamentItemId: number) =>
  MOCK_TOURNAMENT_ITEMS.find(item => item.tournamentItemId === tournamentItemId)!;

/** 4강 첫 매치 — 서버 브래킷이 정한 조합 */
export const MOCK_MATCH_SEMI_FIRST: TournamentMatchT = {
  first: findItem(11),
  second: findItem(12),
};

/** 4강 두 번째 매치 — 첫 매치 기록 응답의 nextMatch */
export const MOCK_MATCH_SEMI_SECOND: TournamentMatchT = {
  first: findItem(13),
  second: findItem(14),
};

/** 결승 매치 — 각 4강에서 왼쪽(더 저렴한 아이템)이 올라온 조합 */
export const MOCK_MATCH_FINAL: TournamentMatchT = {
  first: findItem(11),
  second: findItem(13),
};

export const MOCK_TOURNAMENT_IN_PROGRESS: GetTournamentInProgressResponseT = {
  tournamentId: 2,
  name: 'E2E 매치 토너먼트',
  isOwner: true,
  isRoot: true,
  status: 'IN_PROGRESS',
  inProgress: {
    currentRound: 4,
    lastHistory: null,
    remainingItems: MOCK_TOURNAMENT_ITEMS,
    currentMatch: MOCK_MATCH_SEMI_FIRST,
  },
};

/**
 * 4강 두 매치 종료 후 서버 재조회 응답 — 결승 라운드.
 * tournamentMatch.spec 이 매 매치 `.first()`(왼쪽 카드)를 클릭하므로 결승 진출자는 11·13 이다.
 */
export const MOCK_TOURNAMENT_IN_PROGRESS_FINAL: GetTournamentInProgressResponseT = {
  ...MOCK_TOURNAMENT_IN_PROGRESS,
  inProgress: {
    currentRound: 2,
    lastHistory: null,
    remainingItems: MOCK_TOURNAMENT_ITEMS.filter(item => [11, 13].includes(item.tournamentItemId)),
    currentMatch: MOCK_MATCH_FINAL,
  },
};

/** 결승 기록 응답과 COMPLETED 조회에서 공유하는 1~4위 결과 */
export const MOCK_TOURNAMENT_RESULT: TournamentRankingT[] = MOCK_TOURNAMENT_ITEMS.map(
  (item, index) => ({ ...item, rank: index + 1 })
);

/** 결과(영수증) spec 전용 토너먼트 (id 3) */
export const MOCK_TOURNAMENT_COMPLETED: GetTournamentCompletedResponseT = {
  tournamentId: 3,
  name: 'E2E 결과 토너먼트',
  isOwner: true,
  isRoot: true,
  status: 'COMPLETED',
  completed: {
    result: MOCK_TOURNAMENT_RESULT,
    isGroupTournament: false,
    hasGroupResult: false,
  },
};

/** 소셜 토너먼트 첫 완주자 상태 (id 4) — 친구는 아직 미완주라 hasGroupResult: false */
export const MOCK_TOURNAMENT_GROUP_COMPLETED: GetTournamentCompletedResponseT = {
  ...MOCK_TOURNAMENT_COMPLETED,
  tournamentId: 4,
  name: 'E2E 소셜 결과 토너먼트',
  completed: {
    ...MOCK_TOURNAMENT_COMPLETED.completed,
    isGroupTournament: true,
  },
};
