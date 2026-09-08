import { describe, expect, it } from 'vitest';

import type { NotificationTypeT } from '@/types/notification';

import { getNotificationRoute } from './getNotificationRoute';

const ITEM_TYPES: NotificationTypeT[] = [
  'ITEM_PARSING_COMPLETED',
  'ITEM_PARSING_INCOMPLETE',
  'ITEM_PARSING_FAILED',
  'ITEM_REFRESH_COMPLETED',
];

describe('getNotificationRoute', () => {
  it.each(ITEM_TYPES)(
    '%s — 토너먼트에서 담은 아이템은 refId 가 아니라 tournamentId 로 이동한다',
    type => {
      expect(getNotificationRoute(type, 99, { kind: 'TOURNAMENT', tournamentId: 7 })).toBe(
        '/tournament/7/create'
      );
    }
  );

  it.each(ITEM_TYPES)(
    '%s — 토너먼트 아이템은 담기 화면에서 강조하도록 tournamentItemId 를 쿼리로 싣는다',
    type => {
      expect(
        getNotificationRoute(type, 99, {
          kind: 'TOURNAMENT',
          tournamentId: 7,
          tournamentItemId: 42,
        })
      ).toBe('/tournament/7/create?highlightItem=42');
    }
  );

  it.each([0, -1, 1.5, Number.NaN, '1&action=welcome-join'])(
    'payload 는 런타임 검증이 없어 tournamentItemId 가 %s 로 오면 강조 쿼리 없이 담기 화면으로만 이동한다',
    invalidId => {
      expect(
        getNotificationRoute('ITEM_PARSING_FAILED', 99, {
          kind: 'TOURNAMENT',
          tournamentId: 7,
          tournamentItemId: invalidId as number,
        })
      ).toBe('/tournament/7/create');
    }
  );

  it.each(ITEM_TYPES)(
    '%s — 위시에서 담은 아이템은 refId 가 아니라 wishId 로 위시 상세로 이동한다',
    type => {
      expect(getNotificationRoute(type, 99, { kind: 'WISH', wishId: 12 })).toBe('/archive/wish/12');
    }
  );

  it.each(ITEM_TYPES)('%s — wishId 가 없는 구버전 알림은 위시함 목록으로 보낸다', type => {
    expect(getNotificationRoute(type, 99, { kind: 'WISH' })).toBe('/archive/wish');
  });
});
