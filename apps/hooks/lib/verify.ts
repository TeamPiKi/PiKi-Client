import { createHmac, timingSafeEqual } from 'node:crypto';

/** raw body 의 HMAC hex digest 를 서명 헤더와 상수 시간 비교 ("sha1=", "hmacsha256=" prefix 허용) */
export const verifySignature = (
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  algorithm: 'sha1' | 'sha256'
) => {
  if (!signatureHeader) return false;

  const received = signatureHeader.split('=').pop() ?? '';
  const expected = createHmac(algorithm, secret).update(rawBody).digest('hex');

  const receivedBuffer = Buffer.from(received, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
};
