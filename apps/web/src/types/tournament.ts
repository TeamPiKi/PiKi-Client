import type { TOURNAMENT_PLAY_TYPE, TOURNAMENT_STATUS } from '@/consts/tournament';
import type { PresignedImageRequestT, PresignedImageUploadT } from '@/types/image';
import type { ItemStatusT } from '@/types/item';

export type TournamentStatusT = (typeof TOURNAMENT_STATUS)[keyof typeof TOURNAMENT_STATUS];

export type TournamentPlayTypeT = (typeof TOURNAMENT_PLAY_TYPE)[keyof typeof TOURNAMENT_PLAY_TYPE];

export type TournamentItemT = {
  tournamentItemId: number;
  itemId?: number;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  status?: ItemStatusT;
};

export type TournamentMatchHistoryT = {
  currentRound: number;
  firstTournamentItemId: number;
  secondTournamentItemId: number;
  selectedTournamentItemId: number;
};

export type TournamentRankingT = TournamentItemT & {
  rank: number;
};

export type GetTournamentListRequestT = {
  status?: TournamentStatusT[];
  /** 플레이 유형 필터 (SOLO · SOCIAL). 생략 시 전체이며 status 와 AND 로 걸린다. */
  playType?: TournamentPlayTypeT;
  limit?: number;
};

export type GetTournamentListResponseT = {
  tournamentId: number;
  name: string;
  status: TournamentStatusT;
  createdAt: string;
  participantProfileImages: string[];
  thumbnailUrls: string[];
}[];

export type PostTournamentItemPresignedUrlRequestT = {
  images: PresignedImageRequestT[];
};

export type PostTournamentItemPresignedUrlResponseT = {
  uploads: PresignedImageUploadT[];
};

export type PostTournamentItemImagesRequestT = {
  imageKeys: string[];
};

export type PostTournamentItemImagesResponseT = {
  tournamentItemIds: number[];
};

export type PostCreateTournamentRequestT = {
  name: string;
  /** 초대 마감까지 남은 분 단위 시간 (1~1440). 미지정 시 서버 기본값 사용. */
  inviteDurationMinutes?: number;
};

export type PostCreateTournamentResponseT = {
  tournamentId: number;
};

export type PostTournamentItemLinkResponseT = {
  tournamentItemId: number;
};

/** 초대 코드 / 토너먼트 미리보기 응답 */
export type GetInvitePreviewResponseT = {
  tournamentId: number;
  tournamentName: string;
  itemCount: number;
  participantCount: number;
  /** 요청자(게스트/회원)가 이미 이 토너먼트에 참여 중인지. 미인증·미참여면 false */
  joined: boolean;
};
