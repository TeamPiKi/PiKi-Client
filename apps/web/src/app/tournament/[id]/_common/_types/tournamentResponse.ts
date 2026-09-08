import type {
  TournamentItemT,
  TournamentMatchHistoryT,
  TournamentRankingT,
  TournamentStatusT,
} from '@/types/tournament';

type TournamentParticipantT = {
  userId: string;
  nickname: string;
  itemCount: number;
  profileImage: string;
  isHost: boolean;
};

/** 서버가 브래킷에서 파생해 내려주는 대결 한 판 */
export type TournamentMatchT = {
  first: TournamentItemT;
  second: TournamentItemT;
};

/**
 * PENDING(아이템 담는 중) 토너먼트의 item
 */
export type PendingTournamentItemT = Partial<TournamentItemT> & {
  tournamentItemId: number;
  itemId: number;
  userId?: string;
};

/**
 * `pending` 필드 페이로드.
 * status=PENDING 또는 status=IN_PROGRESS (참여자 대기 케이스) 일 때 내려온다.
 */
type TournamentPendingPayloadT = {
  /**
   * 주최자가 ROOT 토너먼트를 시작했는지 여부.
   * - false (status=PENDING): 참여자는 아직 시작할 수 없음
   * - true (status=IN_PROGRESS): 참여자도 본인 CLONE 시작 가능
   */
  ownerStarted: boolean;
  /** 초대 코드. `ownerStarted=true` 이면 이미 초대 기간이 종료돼 null */
  inviteCode: string | null;
  /** 초대 코드 만료 시각 (ISO 8601). `ownerStarted=true` 이면 null */
  inviteExpiresAt: string | null;
  items: PendingTournamentItemT[];
  participants: TournamentParticipantT[];
};

/** PENDING — 토너먼트 아이템 담는 중. */
export type GetTournamentPendingResponseT = {
  tournamentId: number;
  name: string;
  /** 요청자가 토너먼트 소유자(주최자)인지 여부 */
  isOwner: boolean;
  /** ROOT(원본)이면 true, CLONE(플레이 링크/멤버 시작으로 복제된 인스턴스)이면 false */
  isRoot: boolean;
  status: Extract<TournamentStatusT, 'PENDING'>;
  pending: TournamentPendingPayloadT;
};

/**
 * IN_PROGRESS — 참여자가 본인 매치를 아직 시작하지 않은 대기 상태.
 * 주최자가 ROOT 를 시작했지만 참여자(isOwner=false)는 본인 CLONE 시작 전.
 * 응답은 PENDING 과 동일한 `pending` 페이로드를 받지만 `ownerStarted=true`.
 */
type GetTournamentMemberWaitingResponseT = {
  tournamentId: number;
  name: string;
  isOwner: boolean;
  isRoot: boolean;
  status: Extract<TournamentStatusT, 'IN_PROGRESS'>;
  pending: TournamentPendingPayloadT;
  inProgress?: undefined;
};

/** IN_PROGRESS — 본인 인스턴스의 매치가 진행 중 (재진입 시 복원용). */
export type GetTournamentInProgressResponseT = {
  tournamentId: number;
  name: string;
  /** 요청자가 토너먼트 소유자(주최자)인지 여부 */
  isOwner: boolean;
  /** ROOT(원본)이면 true, CLONE 이면 false */
  isRoot: boolean;
  /** CLONE 일 때만 존재 — 원본(ROOT) 토너먼트 id. group-result 호출 등에서 사용. */
  sourceTournamentId?: number;
  status: Extract<TournamentStatusT, 'IN_PROGRESS'>;
  pending?: undefined;
  inProgress: {
    currentRound: number;
    lastHistory: TournamentMatchHistoryT | null;
    remainingItems: TournamentItemT[];
    /** 서버 브래킷이 정한 현재 대결. 값이 없으면 키째 생략된다 (서버 NON_NULL 직렬화) */
    currentMatch?: TournamentMatchT;
  };
};

/** COMPLETED — 결과 */
export type GetTournamentCompletedResponseT = {
  tournamentId: number;
  name: string;
  /** 요청자가 토너먼트 소유자(주최자)인지 여부 */
  isOwner: boolean;
  /** ROOT(원본)이면 true, CLONE 이면 false */
  isRoot: boolean;
  /** CLONE 일 때만 존재 — 원본(ROOT) 토너먼트 id. group-result 호출 등에서 사용. */
  sourceTournamentId?: number;
  status: Extract<TournamentStatusT, 'COMPLETED'>;
  completed: {
    result: TournamentRankingT[];
    /** 소셜 토너먼트 여부 — 전체 결과 보기 배너 노출용 */
    isGroupTournament: boolean;
    /** 소셜 토너먼트에서 완료한 플레이어 2명 이상이면 true */
    hasGroupResult: boolean;
    /** 플레이 링크 만료 시각 (ISO 8601). 아직 링크 생성 전이면 응답에 없음 */
    playLinkExpiresAt?: string;
  };
};

export type GetTournamentResponseT =
  | GetTournamentPendingResponseT
  | GetTournamentMemberWaitingResponseT
  | GetTournamentInProgressResponseT
  | GetTournamentCompletedResponseT;

/**
 * 시작 응답.
 * - 주최자(ROOT): 본인 tournamentId 반환
 * - 참여자(CLONE): 새로 생성된 CLONE tournamentId 반환 (이후 본인 ID 로 진행)
 */
export type PostStartTournamentResponseT = {
  tournamentId: number;
  items: TournamentItemT[];
};

/** 플레이 링크 생성 응답 — playLinkExpiresAt 문자열만 반환 */
export type PostPlayLinkResponseT = string;

export type PostRecordMatchRequestT = TournamentMatchHistoryT;

/**
 * 매치 기록 응답. 서버가 다음 대결까지 함께 내려준다.
 * 값이 없는 필드는 키째 생략되므로(NON_NULL 직렬화) 둘 다 없으면 응답은 `{}` 다.
 * - `nextMatch`: 같은 라운드의 다음 대결. 없으면 라운드 종료 → 재조회
 * - `completed`: 토너먼트 종료 시에만 채워진다
 */
export type PostRecordMatchResponseT = {
  nextMatch?: TournamentMatchT;
  completed?: {
    result: TournamentRankingT[];
    isGroupTournament: boolean;
    hasGroupResult: boolean;
    canAddItem: boolean;
    playLinkExpiresAt?: string;
  };
};
