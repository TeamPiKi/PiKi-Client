import { describe, expect, it } from 'vitest';

import type { NotificationTypeT } from '@/types/notification';

import { getNotificationRoute } from './getNotificationRoute';

const PARSING_TYPES: NotificationTypeT[] = [
  'ITEM_PARSING_COMPLETED',
  'ITEM_PARSING_INCOMPLETE',
  'ITEM_PARSING_FAILED',
];

describe('getNotificationRoute', () => {
  it.each(PARSING_TYPES)(
    '%s — 토너먼트에서 담은 아이템은 refId 가 아니라 tournamentId 로 이동한다',
    type => {
      expect(getNotificationRoute(type, 99, { kind: 'TOURNAMENT', tournamentId: 7 })).toBe(
        '/tournament/7/create'
      );
    }
  );

  it.each(PARSING_TYPES)('%s — 위시에서 담은 아이템은 위시리스트로 보낸다', type => {
    expect(getNotificationRoute(type, 99, { kind: 'WISH' })).toBe('/archive/wish');
  });
});
