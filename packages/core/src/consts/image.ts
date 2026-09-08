/** 이미지 업로드 용량 상한 - 5MB */
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export const SUPPORTED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];
