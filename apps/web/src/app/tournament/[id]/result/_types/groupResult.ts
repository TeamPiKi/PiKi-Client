type GroupResultParticipantT = {
  userId: string;
  nickname: string;
  profileImage: string;
  isHost: boolean;
};

export type GroupResultItemT = {
  rank: number;
  itemId: number;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
  /** 이 rank에 이 아이템을 선택한 참여자 목록 */
  chosenBy: GroupResultParticipantT[];
};

export type GetGroupResultResponseT = {
  items: GroupResultItemT[];
};
