export type PostJoinRequestT = {
  /** 영문 대문자 3 + 숫자 3 (서버 패턴: [A-Z]{3}\d{3}). 링크 직접 진입 시 생략 가능 */
  inviteCode?: string;
};

export type PatchTournamentNicknameRequestT = {
  /** 이 토너먼트에서만 쓰이는 표시명 (1~10자). 전역 프로필 닉네임과 별개 */
  nickname: string;
};
