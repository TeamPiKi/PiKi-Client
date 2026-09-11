import type { Page } from '@playwright/test';

import { ENDPOINTS } from '@/consts/api';

import { expect, test } from '@e2e/fixtures/mockApiFixture';
import { createFakeJwt } from '@e2e/helpers/fakeJwt';
import { MOCK_GUEST_ME } from '@e2e/mocks/me';

/** 기본 storageState(MEMBER)를 게스트 role 토큰으로 덮어써 서버 게이트를 게스트로 통과 */
const useGuestToken = async (page: Page) => {
  const token = createFakeJwt(60 * 60, 'GUEST');
  const cookie = { domain: 'localhost', path: '/', value: token };

  await page.context().addCookies([
    { ...cookie, name: 'access_token' },
    { ...cookie, name: 'refresh_token' },
  ]);
};

test('게스트가 위시 탭에 들어가면 로그인 유도 화면이 뜬다', async ({ page, api }) => {
  api.get(ENDPOINTS.USER, MOCK_GUEST_ME);
  await useGuestToken(page);

  await page.goto('/archive/wish');

  await expect(
    page.getByRole('heading', { name: '위시를 담으려면 로그인이 필요해요' })
  ).toBeVisible();

  /** 차단 화면에서도 탭바는 남는다 — 다른 탭 이동 허용 (지점 간 일관 기준) */
  await expect(page.getByRole('link', { name: '홈' })).toBeVisible();

  /** 로그인 후 차단당한 맥락으로 복귀하도록 redirect 파라미터를 싣는다 */
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Farchive%2Fwish/);
});

test('게스트가 토너먼트 탭에 들어가면 로그인 유도 화면이 뜬다', async ({ page, api }) => {
  api.get(ENDPOINTS.USER, MOCK_GUEST_ME);
  await useGuestToken(page);

  await page.goto('/archive/tournament');

  await expect(
    page.getByRole('heading', { name: '토너먼트를 확인하려면 로그인이 필요해요' })
  ).toBeVisible();

  await expect(page.getByRole('link', { name: '홈' })).toBeVisible();

  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Farchive%2Ftournament/);
});
