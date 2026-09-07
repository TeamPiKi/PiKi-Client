import type { DeepLinkPayloadT } from '@piki/core';
import { describe, expect, it } from 'vitest';

import { getNotificationRoute } from '@/app/notification/_utils/getNotificationRoute';

import { getPushNotificationRoute } from './pushNotificationRoute';

describe('getPushNotificationRoute', () => {
  const payloads: DeepLinkPayloadT[] = [
    { type: 'TOURNAMENT_JOINED', refId: 1 },
    { type: 'TOURNAMENT_ITEM_ADDED', refId: 2 },
    { type: 'ITEM_PARSING_COMPLETED', refId: 3, kind: 'WISH' },
    { type: 'ITEM_PARSING_INCOMPLETE', refId: 4, kind: 'TOURNAMENT', tournamentId: 8 },
    { type: 'ITEM_PARSING_FAILED', refId: 5, kind: 'TOURNAMENT', tournamentId: 9 },
  ];

  it.each(payloads)('$type 은 푸시로 눌러도, 인앱에서 눌러도 같은 화면으로 간다', payload => {
    const inAppRoute =
      'kind' in payload
        ? getNotificationRoute(payload.type, payload.refId, {
            kind: payload.kind,
            tournamentId: payload.tournamentId,
          })
        : getNotificationRoute(payload.type, payload.refId);

    expect(getPushNotificationRoute(payload)).toBe(inAppRoute);
  });
});
