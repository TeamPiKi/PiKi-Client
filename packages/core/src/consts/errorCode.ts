/**
 * 서버 에러 코드 → 사용자용 에러 메시지
 *
 * 원본: https://dev.api.piki.day/v3/api-docs 의 `info.description`
 * 클라이언트가 도달할 수 없는 서버 간 통신 코드(`APPLE-*`, `EXTRACTOR-*`, `SNAPSHOT-*`)는 제외한다.
 */
export const ERROR_MESSAGE_MAP = {
  /** 공통 4xx */
  'COMMON-UNAUTHORIZED': '로그인이 필요해요.',
  'COMMON-FORBIDDEN': '접근할 수 없는 페이지예요.',
  'COMMON-NOT-FOUND': '요청하신 정보를 찾을 수 없어요.',
  'COMMON-INVALID-INPUT': '다시 한번 확인해 주세요.',
  'COMMON-METHOD-NOT-ALLOWED': '지원하지 않는 요청 방식이에요.',
  'COMMON-UNSUPPORTED-MEDIA-TYPE': '지원하지 않는 형식이에요.',
  'COMMON-TOO-MANY-REQUESTS': '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',

  /** 공통 5xx */
  'COMMON-RETRYABLE': '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
  'COMMON-SERVER-BUSY': '서버가 혼잡해요. 잠시 후 다시 시도해 주세요.',
  'COMMON-SERVER-ERROR': '서버에 문제가 발생했어요. 불편을 드려 죄송해요.',

  /** USER */
  'USER-001': '존재하지 않는 계정이에요.',
  'USER-002': '이미 가입된 계정이에요.',
  'USER-003': '탈퇴한 계정이에요.',
  'USER-004': '이미 누군가 쓰고 있는 닉네임이에요. 다른 걸 입력해 주세요.',
  'USER-005': '닉네임을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  'USER-006': '닉네임을 입력해 주세요.',
  'USER-007': '게스트는 탈퇴할 수 없어요.',
  'USER-008': '프로필 이미지는 회원만 바꿀 수 있어요.',
  'USER-009': '빈 이미지 파일은 올릴 수 없어요.',
  'USER-010': '지원하지 않는 이미지 형식이에요.',
  'USER-011': '이미지 파일이 손상되었거나 형식이 맞지 않아요.',
  'USER-012': '닉네임은 10자까지 입력할 수 있어요.',
  'USER-013': '사용할 수 없는 닉네임이에요.',

  /** AUTH */
  'AUTH-001': '로그인 정보가 만료됐어요. 다시 로그인해 주세요.',
  'AUTH-002': '닉네임을 입력해 주세요.',
  'AUTH-003': '다시 로그인해 주세요.',

  /** OAUTH */
  'OAUTH-001': '로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',
  'OAUTH-002': '로그인에 실패했어요. 다시 시도해 주세요.',
  'OAUTH-003': '지원하지 않는 로그인 방식이에요.',
  'OAUTH-004': '로그인 정보가 만료됐어요. 다시 시도해 주세요.',
  'OAUTH-005': '로그인 정보가 만료됐어요. 다시 시도해 주세요.',
  'OAUTH-006': '로그인 정보가 만료됐어요. 다시 로그인해 주세요.',
  'OAUTH-007': '로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',

  /** TOURNAMENT */
  'TOURNAMENT-001': '이 토너먼트에 접근할 수 없어요.',
  'TOURNAMENT-002': '토너먼트를 찾을 수 없어요. 이미 삭제됐을 수 있어요.',
  'TOURNAMENT-003': '올바르지 않은 선택이에요.',
  'TOURNAMENT-004': '이 토너먼트에 없는 아이템이에요.',
  'TOURNAMENT-005': '토너먼트가 시작되기 전에만 할 수 있어요.',
  'TOURNAMENT-006': '토너먼트가 진행 중일 때만 할 수 있어요.',
  'TOURNAMENT-007': '아이템은 2~32개 사이로 담아주세요.',
  'TOURNAMENT-008': '아이템은 최대 32개까지 담을 수 있어요.',
  'TOURNAMENT-009': '이미 담은 아이템이에요.',
  'TOURNAMENT-010': '토너먼트 아이템을 찾을 수 없어요.',
  'TOURNAMENT-011': '존재하지 않는 아이템이 포함되어 있어요.',
  'TOURNAMENT-012': '아직 정보를 가져오는 중인 상품이에요. 잠시 후 추가해 주세요.',
  'TOURNAMENT-013': '아직 준비 중인 상품이 있어요. 모두 준비되면 시작할 수 있어요.',
  'TOURNAMENT-014': '가격 정보가 없는 상품이 있어요. 직접 입력 후 시작해 주세요.',
  'TOURNAMENT-015': '이미지는 1~5장만 올릴 수 있어요.',
  'TOURNAMENT-016': '위시에 저장된 아이템만 담을 수 있어요.',
  'TOURNAMENT-017': '이미 탈락한 아이템이에요.',
  'TOURNAMENT-018': '지금은 진행할 수 없는 단계예요.',
  'TOURNAMENT-019': '토너먼트가 끝난 후 삭제할 수 있어요.',
  'TOURNAMENT-020': '초대 코드가 올바르지 않아요.',
  'TOURNAMENT-021': '초대 링크가 만료됐어요.',
  'TOURNAMENT-022': '이미 참여 중인 토너먼트예요.',
  'TOURNAMENT-023': '완료된 토너먼트에서만 할 수 있어요.',
  'TOURNAMENT-024': '플레이 링크로 참여한 토너먼트는 공유 링크를 만들 수 없어요.',
  'TOURNAMENT-025': '이미 플레이 링크가 만들어진 토너먼트예요.',
  'TOURNAMENT-026': '아직 플레이 링크가 만들어지지 않은 토너먼트예요.',
  'TOURNAMENT-027': '플레이 링크가 만료됐어요.',
  'TOURNAMENT-028': '완료된 토너먼트에서만 결과를 볼 수 있어요.',
  'TOURNAMENT-029': '이미 이 플레이 링크로 만든 토너먼트가 있어요.',
  'TOURNAMENT-030': '참여 인원이 가득 찼어요.',
  'TOURNAMENT-031': '플레이 링크로 참여한 토너먼트에서는 친구 결과를 볼 수 없어요.',
  'TOURNAMENT-032': '플레이 링크로 만든 토너먼트에는 아이템을 추가할 수 없어요.',
  'TOURNAMENT-033': '조회 개수는 1 이상이어야 해요.',
  'TOURNAMENT-034': '지금 대결할 수 있는 조합이 아니에요.',
  'TOURNAMENT-035': '이미 결과가 기록된 대결이에요.',
  'TOURNAMENT-036': '토너먼트 만들기는 회원만 이용할 수 있어요.',
  'TOURNAMENT-037': '이 토너먼트에는 지금 아이템을 추가할 수 없어요. 잠시 후 다시 시도해 주세요.',
  'TOURNAMENT-038': '플레이 링크로 만든 토너먼트에서는 아이템을 수정하거나 삭제할 수 없어요.',
  'TOURNAMENT-039': '정보가 비어 있는 상품이에요. 내용을 채운 뒤 담아 주세요.',
  'TOURNAMENT-040': '정보가 비어 있는 상품이 있어요. 모두 채워야 시작할 수 있어요.',

  /** WISH */
  'WISH-001': '위시리스트는 회원만 이용할 수 있어요.',
  'WISH-002': '내 위시 아이템만 볼 수 있어요.',
  'WISH-003': '페이지를 불러오지 못했어요. 새로고침 해주세요.',
  'WISH-004': '이미 삭제된 아이템이에요.',
  'WISH-005': '이미지는 1~5장만 올릴 수 있어요.',
  'WISH-006': '한 번에 최대 100개까지 삭제할 수 있어요.',
  'WISH-007': '링크가 없는 항목은 새로고침할 수 없습니다.',
  'WISH-008': '추출에 실패한 항목은 새로고침 대신 정보를 직접 입력해 복구해 주세요.',
  'WISH-009': '이미 위시리스트에 등록된 상품이에요.',
  'WISH-010': '지금은 더 담을 수 없어요. 잠시 후 다시 시도해 주세요.',

  /** ITEM */
  'ITEM-003': '상품 이름을 입력해 주세요.',
  'ITEM-004': '상품 가격을 입력해 주세요.',
  'ITEM-005': '상품 이미지를 등록해 주세요.',

  /** LINK */
  'LINK-001': '올바른 링크 형식이 아니에요. 다시 확인해 주세요.',
  'LINK-002': 'https 링크만 등록할 수 있어요.',
  'LINK-003': '아직 지원하지 않는 쇼핑몰이에요. 상품 이미지를 직접 등록해 주세요.',

  /** ANNOUNCEMENT */
  'ANNOUNCEMENT-001': '존재하지 않는 공지예요.',
  'ANNOUNCEMENT-002': '페이지를 불러오지 못했어요. 새로고침 해주세요.',

  /** STORAGE */
  'STORAGE-001': '이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
  'STORAGE-002': '이미지 업로드 URL 을 발급하지 못했어요. 잠시 후 다시 시도해 주세요.',
  'STORAGE-003': '이미지 업로드 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
  'STORAGE-005': '이미지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',

  /** UPLOAD */
  'UPLOAD-001': '올바르지 않은 이미지 업로드 정보예요. 업로드를 다시 시도해 주세요.',
  'UPLOAD-002': '아직 업로드되지 않은 이미지예요. 업로드를 마친 뒤 다시 시도해 주세요.',

  /** PRODUCTIMAGE */
  'PRODUCTIMAGE-001': '빈 이미지 파일은 올릴 수 없어요.',
  'PRODUCTIMAGE-002': '이미지 형식을 확인할 수 없어요.',
  'PRODUCTIMAGE-003': '지원하지 않는 이미지 형식이에요.',

  /** NOTIFICATION */
  'NOTIFICATION-001': '알림을 불러오지 못했어요. 새로고침 해주세요.',
} as const;

/**
 * 에러 코드 의미 기반 상수
 * — 에러 코드 기반 분기 시 문자열 리터럴 대신 이걸 사용할 것.
 *
 * @example
 * if(error.code === ERROR_CODE.USER_NOT_FOUND) (O)
 * if(error.code === 'USER-001') (X)
 */
export const ERROR_CODE = {
  /** 공통 */
  COMMON_UNAUTHORIZED: 'COMMON-UNAUTHORIZED',
  COMMON_FORBIDDEN: 'COMMON-FORBIDDEN',
  COMMON_NOT_FOUND: 'COMMON-NOT-FOUND',
  COMMON_INVALID_INPUT: 'COMMON-INVALID-INPUT',
  COMMON_METHOD_NOT_ALLOWED: 'COMMON-METHOD-NOT-ALLOWED',
  COMMON_UNSUPPORTED_MEDIA_TYPE: 'COMMON-UNSUPPORTED-MEDIA-TYPE',
  COMMON_TOO_MANY_REQUESTS: 'COMMON-TOO-MANY-REQUESTS',
  COMMON_RETRYABLE: 'COMMON-RETRYABLE',
  COMMON_SERVER_BUSY: 'COMMON-SERVER-BUSY',
  COMMON_SERVER_ERROR: 'COMMON-SERVER-ERROR',

  /** 계정 */
  USER_NOT_FOUND: 'USER-001',
  USER_ALREADY_MEMBER: 'USER-002',
  USER_DELETED: 'USER-003',
  USER_DUPLICATE_NICKNAME: 'USER-004',
  USER_NICKNAME_GENERATION_FAILED: 'USER-005',
  USER_NICKNAME_BLANK: 'USER-006',
  USER_GUEST_CANNOT_WITHDRAW: 'USER-007',
  USER_GUEST_CANNOT_UPDATE_PROFILE_IMAGE: 'USER-008',
  USER_EMPTY_PROFILE_IMAGE: 'USER-009',
  USER_UNSUPPORTED_PROFILE_IMAGE_TYPE: 'USER-010',
  USER_MALFORMED_PROFILE_IMAGE: 'USER-011',
  USER_NICKNAME_TOO_LONG: 'USER-012',
  USER_NICKNAME_RESERVED: 'USER-013',

  /** 인증 */
  AUTH_INVALID_TOKEN: 'AUTH-001',
  AUTH_MISSING_NICKNAME: 'AUTH-002',
  AUTH_REFRESH_TOKEN_REQUIRED: 'AUTH-003',

  /** 소셜 로그인 */
  OAUTH_PROVIDER_ERROR: 'OAUTH-001',
  OAUTH_INVALID_REQUEST: 'OAUTH-002',
  OAUTH_UNSUPPORTED_PROVIDER: 'OAUTH-003',
  OAUTH_INVALID_STATE: 'OAUTH-004',
  OAUTH_INVALID_GRANT: 'OAUTH-005',
  OAUTH_INVALID_PROVIDER_TOKEN: 'OAUTH-006',
  OAUTH_MISCONFIGURED: 'OAUTH-007',

  /** 토너먼트 */
  TOURNAMENT_FORBIDDEN: 'TOURNAMENT-001',
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT-002',
  TOURNAMENT_INVALID_WINNER: 'TOURNAMENT-003',
  TOURNAMENT_INVALID_ITEM: 'TOURNAMENT-004',
  TOURNAMENT_NOT_PENDING: 'TOURNAMENT-005',
  TOURNAMENT_NOT_IN_PROGRESS: 'TOURNAMENT-006',
  TOURNAMENT_INVALID_ITEM_COUNT: 'TOURNAMENT-007',
  TOURNAMENT_TOO_MANY_ITEMS: 'TOURNAMENT-008',
  TOURNAMENT_DUPLICATE_ITEM: 'TOURNAMENT-009',
  TOURNAMENT_NOT_FOUND_ITEM: 'TOURNAMENT-010',
  TOURNAMENT_NOT_FOUND_ITEMS: 'TOURNAMENT-011',
  TOURNAMENT_ITEM_NOT_READY: 'TOURNAMENT-012',
  TOURNAMENT_ITEM_NOT_READY_TO_START: 'TOURNAMENT-013',
  TOURNAMENT_ITEM_PRICE_REQUIRED: 'TOURNAMENT-014',
  TOURNAMENT_INVALID_IMAGE_COUNT: 'TOURNAMENT-015',
  TOURNAMENT_ITEM_NOT_IN_WISHLIST: 'TOURNAMENT-016',
  TOURNAMENT_ELIMINATED_ITEM: 'TOURNAMENT-017',
  TOURNAMENT_INVALID_CURRENT_ROUND: 'TOURNAMENT-018',
  TOURNAMENT_IN_PROGRESS_CANNOT_BE_DELETED: 'TOURNAMENT-019',
  TOURNAMENT_INVALID_INVITE_CODE: 'TOURNAMENT-020',
  TOURNAMENT_INVITE_EXPIRED: 'TOURNAMENT-021',
  TOURNAMENT_ALREADY_PARTICIPANT: 'TOURNAMENT-022',
  TOURNAMENT_NOT_COMPLETED: 'TOURNAMENT-023',
  TOURNAMENT_CLONED_CANNOT_SHARE_PLAY_LINK: 'TOURNAMENT-024',
  TOURNAMENT_PLAY_LINK_ALREADY_CREATED: 'TOURNAMENT-025',
  TOURNAMENT_PLAY_LINK_NOT_CREATED: 'TOURNAMENT-026',
  TOURNAMENT_PLAY_LINK_EXPIRED: 'TOURNAMENT-027',
  TOURNAMENT_GROUP_RESULT_NOT_AVAILABLE: 'TOURNAMENT-028',
  TOURNAMENT_ALREADY_CLONED: 'TOURNAMENT-029',
  TOURNAMENT_PARTICIPANT_LIMIT_EXCEEDED: 'TOURNAMENT-030',
  TOURNAMENT_CLONED_CANNOT_VIEW_GROUP_RESULT: 'TOURNAMENT-031',
  TOURNAMENT_CLONED_CANNOT_ADD_ITEMS: 'TOURNAMENT-032',
  TOURNAMENT_INVALID_LIMIT: 'TOURNAMENT-033',
  TOURNAMENT_INVALID_MATCH_PAIR: 'TOURNAMENT-034',
  TOURNAMENT_MATCH_ALREADY_RECORDED: 'TOURNAMENT-035',
  TOURNAMENT_GUEST_CANNOT_CREATE: 'TOURNAMENT-036',
  TOURNAMENT_ITEM_ADD_RATE_LIMITED: 'TOURNAMENT-037',
  TOURNAMENT_CLONED_CANNOT_MODIFY_ITEMS: 'TOURNAMENT-038',
  TOURNAMENT_INCOMPLETE_ITEM_CANNOT_ADD: 'TOURNAMENT-039',
  TOURNAMENT_ITEM_INCOMPLETE: 'TOURNAMENT-040',

  /** 위시 */
  WISH_GUEST_CANNOT_USE_WISHLIST: 'WISH-001',
  WISH_FORBIDDEN_ITEMS: 'WISH-002',
  WISH_INVALID_CURSOR: 'WISH-003',
  WISH_NOT_FOUND: 'WISH-004',
  WISH_INVALID_IMAGE_COUNT: 'WISH-005',
  WISH_INVALID_ID_COUNT: 'WISH-006',
  WISH_NOT_REFRESHABLE: 'WISH-007',
  WISH_FAILED_NOT_REFRESHABLE: 'WISH-008',
  WISH_ALREADY_EXISTS: 'WISH-009',
  WISH_RATE_LIMITED: 'WISH-010',

  /** 상품 */
  ITEM_NAME_REQUIRED_FOR_READY: 'ITEM-003',
  ITEM_PRICE_REQUIRED_FOR_READY: 'ITEM-004',
  ITEM_IMAGE_REQUIRED_FOR_READY: 'ITEM-005',

  /** 상품 링크 */
  LINK_INVALID_FORMAT: 'LINK-001',
  LINK_UNSUPPORTED_SCHEME: 'LINK-002',
  LINK_UNSUPPORTED_PLATFORM: 'LINK-003',

  /** 공지 */
  ANNOUNCEMENT_NOT_FOUND: 'ANNOUNCEMENT-001',
  ANNOUNCEMENT_INVALID_CURSOR: 'ANNOUNCEMENT-002',

  /** 이미지 스토리지 */
  STORAGE_UPLOAD_FAILED: 'STORAGE-001',
  STORAGE_PRESIGN_FAILED: 'STORAGE-002',
  STORAGE_EXISTS_CHECK_FAILED: 'STORAGE-003',
  STORAGE_LOAD_FAILED: 'STORAGE-005',

  /** 이미지 업로드 */
  UPLOAD_INVALID_KEY: 'UPLOAD-001',
  UPLOAD_NOT_UPLOADED: 'UPLOAD-002',

  /** 상품 이미지 */
  PRODUCT_IMAGE_EMPTY_IMAGE: 'PRODUCTIMAGE-001',
  PRODUCT_IMAGE_UNKNOWN_TYPE: 'PRODUCTIMAGE-002',
  PRODUCT_IMAGE_UNSUPPORTED_TYPE: 'PRODUCTIMAGE-003',

  /** 알림 */
  NOTIFICATION_INVALID_CURSOR: 'NOTIFICATION-001',
} as const satisfies Record<string, keyof typeof ERROR_MESSAGE_MAP>;

/**
 * NOTE: 완전성 검증을 위해 추가한 unexported 타입
 * — 카탈로그에 있는데 `ERROR_CODE` 에 이름이 없는 코드를 컴파일 타임에 잡기 위해 추가함
 */
type UnnamedErrorCodeT = Exclude<
  keyof typeof ERROR_MESSAGE_MAP,
  (typeof ERROR_CODE)[keyof typeof ERROR_CODE]
>;
const _assertEveryCodeIsNamed: UnnamedErrorCodeT extends never ? true : UnnamedErrorCodeT = true;

/** code 매핑 실패 시 공통 fallback 문구 */
export const DEFAULT_ERROR_MESSAGE = '요청을 처리하지 못했어요.';

/** code 를 알 수 없는 5xx·네트워크 오류 fallback 문구 */
export const SERVER_ERROR_MESSAGE = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';

/** S3 실패 문구 */
export const S3_UPLOAD_ERROR_MESSAGE = '이미지 업로드에 실패했어요. 잠시 후 다시 시도해 주세요.';
