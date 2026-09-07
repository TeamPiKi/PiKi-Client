import { ENDPOINTS } from '@/consts/api';

import { expect, test } from '@e2e/fixtures/mockApiFixture';
import { MOCK_MEMBER_ME } from '@e2e/mocks/me';

const MOCK_UPLOAD_URL = 'https://s3.example/e2e/profile-upload';

/** 브라우저 <img> 가 바로 디코드할 수 있는 원본 — 크롭 화면 진입 검증용 */
const MOCK_PICKED_IMAGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">' +
  '<rect width="320" height="320" fill="#34d399"/>' +
  '</svg>';

test('프로필 이미지를 고르면 크롭 에디터가 열리고, 완료하면 JPEG 로 S3 에 직접 업로드된다', async ({
  page,
  api,
}) => {
  api.get(ENDPOINTS.USER, MOCK_MEMBER_ME);
  api.post(ENDPOINTS.USER_PROFILE_IMAGE_PRESIGNED, {
    imageKey: 'e2e-image-key',
    uploadUrl: MOCK_UPLOAD_URL,
    contentType: 'image/jpeg',
  });
  api.patch(ENDPOINTS.USER, MOCK_MEMBER_ME);

  /** S3 직접 PUT — 서명과 어긋나면 실서버가 거부하므로 Content-Type·바이트를 검증한다 */
  let putContentType: string | undefined;
  let putBodyPrefixHex: string | undefined;
  await page.route(MOCK_UPLOAD_URL, async route => {
    putContentType = route.request().headers()['content-type'];
    putBodyPrefixHex = route.request().postDataBuffer()?.subarray(0, 3).toString('hex');
    await route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/mypage/edit');

  /** 카메라 뱃지만이 아니라 프로필 이미지 영역 전체가 클릭으로 피커를 연다 */
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '프로필 이미지 변경' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'photo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(MOCK_PICKED_IMAGE_SVG),
  });

  await expect(page.getByText('프로필 이미지 편집')).toBeVisible();
  /** 터치 환경(기본 프로젝트는 iPhone 에뮬레이션)은 핀치줌을 쓰므로 줌 슬라이더가 숨겨진다 */
  await expect(page.getByRole('slider', { name: '이미지 확대/축소' })).toBeHidden();

  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByText('프로필 이미지 편집')).not.toBeVisible();

  await page.getByRole('button', { name: '수정하기' }).click();

  await expect(page).toHaveURL(/\/mypage$/);
  expect(putContentType).toBe('image/jpeg');
  // JPEG SOI 마커 — presign contentType 과 실제 바이트가 일치해야 서버 USER-011 을 피한다
  expect(putBodyPrefixHex).toBe('ffd8ff');
});

test.describe('마우스(fine pointer) 환경', () => {
  test.use({ hasTouch: false, isMobile: false });

  test('핀치줌이 없는 마우스 환경에서는 줌 슬라이더가 노출된다', async ({ page, api }) => {
    api.get(ENDPOINTS.USER, MOCK_MEMBER_ME);

    await page.goto('/mypage/edit');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '프로필 이미지 변경' }).click();
    await (
      await fileChooserPromise
    ).setFiles({
      name: 'photo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(MOCK_PICKED_IMAGE_SVG),
    });

    await expect(page.getByText('프로필 이미지 편집')).toBeVisible();
    await expect(page.getByRole('slider', { name: '이미지 확대/축소' })).toBeVisible();
  });
});

test('브라우저가 디코드하지 못하는 이미지는 크롭 에디터 대신 안내 토스트를 띄운다', async ({
  page,
  api,
}) => {
  api.get(ENDPOINTS.USER, MOCK_MEMBER_ME);

  await page.goto('/mypage/edit');
  await expect(page.getByRole('button', { name: '프로필 이미지 변경' })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'photo.heic',
    mimeType: 'image/heic',
    buffer: Buffer.from('not-an-image'),
  });

  await expect(page.getByText('지원하지 않는 이미지 형식이에요.')).toBeVisible();
  await expect(page.getByText('프로필 이미지 편집')).not.toBeVisible();
});
