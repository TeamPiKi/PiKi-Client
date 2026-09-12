export const ENDPOINTS = {
  /** 유저 */
  USER: '/api/v1/users/me',
  USER_NICKNAME_CHECK: '/api/v1/users/nickname/check',
  USER_PROFILE_IMAGE_PRESIGNED: '/api/v1/users/me/profile-image',

  /** 인증 */
  AUTH_URL: (provider: string) => `/api/v1/auth/${provider}/url`,
  AUTH_LOGIN: (provider: string) => `/api/v1/auth/login/${provider}`,
  AUTH_APPLE_CALLBACK: '/api/v1/auth/apple/callback',
  AUTH_GUEST: '/api/v1/auth/guest',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_TOKEN_REFRESH: '/api/v1/auth/token/refresh',

  /** 위시리스트 */
  WISHLISTS: '/api/v1/wishlists',
  WISHLIST: (id: number) => `/api/v1/wishlists/${id}`,
  WISH_IMAGE_PRESIGNED: '/api/v1/wishlists/images/presigned',
  WISH_IMAGE_CONFIRM: '/api/v1/wishlists/images/confirm',
  WISHLIST_REFRESH: (id: number) => `/api/v1/wishlists/${id}/refresh`,

  /** 토너먼트 */
  TOURNAMENTS: '/api/v1/tournaments',
  TOURNAMENT: (id: number) => `/api/v1/tournaments/${id}`,
  TOURNAMENT_START: (id: number) => `/api/v1/tournaments/${id}/start`,
  TOURNAMENT_MATCHES: (id: number) => `/api/v1/tournaments/${id}/matches`,
  TOURNAMENT_ITEM_LINK: (id: number) => `/api/v1/tournaments/${id}/items/link`,
  TOURNAMENT_ITEM_IMAGE_PRESIGNED: (id: number) =>
    `/api/v1/tournaments/${id}/items/images/presigned`,
  TOURNAMENT_ITEM_IMAGE_CONFIRM: (id: number) => `/api/v1/tournaments/${id}/items/images/confirm`,
  TOURNAMENT_ITEM: (id: number, ItemId: number) => `/api/v1/tournaments/${id}/items/${ItemId}`,
  TOURNAMENT_ITEMS_FROM_WISH: (id: number) => `/api/v1/tournaments/${id}/items/wish`,
  TOURNAMENT_PLAY_LINK: (id: number) => `/api/v1/tournaments/${id}/play-link`,
  TOURNAMENT_JOIN: (id: number) => `/api/v1/tournaments/${id}/join`,
  TOURNAMENT_NICKNAME: (id: number) => `/api/v1/tournaments/${id}/nickname`,
  TOURNAMENT_INVITE: (id: number) => `/api/v1/tournaments/${id}/invite`,
  TOURNAMENT_INVITE_PREVIEW_BY_CODE: '/api/v1/tournaments/by-invite-code',
  TOURNAMENT_FROM_PLAY_LINK: (sourceTournamentId: number) =>
    `/api/v1/tournaments/${sourceTournamentId}/from-play-link`,
  TOURNAMENT_GROUP_RESULT: (id: number) => `/api/v1/tournaments/${id}/group-result`,

  /** 알림 */
  NOTIFICATIONS_SUBSCRIBE: '/api/v1/notifications/subscribe',
  NOTIFICATIONS: '/api/v1/notifications',
  NOTIFICATIONS_READ: '/api/v1/notifications/read',
  NOTIFICATIONS_HEARTBEAT: '/api/v1/notifications/heartbeat',

  /** FCM */
  FCM_TOKENS: '/api/v1/fcm/tokens',
} as const;
