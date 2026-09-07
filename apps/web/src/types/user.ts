/** 유저 식별 타입: GUEST(비회원), MEMBER(회원) */
export type UserIdentityTypeT = 'GUEST' | 'MEMBER';

/** 유저 정보 */
export type UserT = GuestUserT | MemberUserT;

export type GuestUserT = BaseUserT & {
  /** 유저 식별 타입 */
  identityType: 'GUEST';
  /** 유저 이메일 */
  email: null;
};

export type MemberUserT = BaseUserT & {
  /** 유저 식별 타입 */
  identityType: 'MEMBER';
  /** 유저 이메일 */
  email: string;
};

type BaseUserT = {
  /** 유저 ID */
  id: string;
  /** 유저 닉네임 */
  nickname: string;
  /** 유저 프로필 이미지 URL */
  profileImage: string;
};

/** 유저 정보 수정 요청 — 담아 보낸 필드만 갱신된다 */
export type PatchMeRequestT = {
  /** 변경할 닉네임 (최대 10자) */
  nickname?: string;
  /** 업로드를 마친 프로필 이미지 key */
  imageKey?: string;
};

/** 프로필 이미지 업로드 URL 발급 요청 */
export type PostProfileImagePresignedUrlRequestT = {
  /** 올릴 이미지의 MIME 타입 (png · jpeg · webp · heic · heif) */
  contentType: string;
};

/** 닉네임 중복 체크 응답 */
export type GetNicknameCheckResponseT = {
  available: boolean;
};
