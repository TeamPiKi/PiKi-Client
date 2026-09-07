import { describe, expect, it } from 'vitest';

import { URL_PATTERN, extractUrlFromText } from './extractUrl';

describe('extractUrlFromText', () => {
  it('상품명과 URL 이 섞인 공유 텍스트에서 URL 만 뽑는다', () => {
    expect(extractUrlFromText('[제작]쿨링 리본 미니원피스\nhttps://s.zigzag.kr/XWnpU1fuZx')).toBe(
      'https://s.zigzag.kr/XWnpU1fuZx'
    );
    expect(extractUrlFromText('https://s.zigzag.kr/XWnpU1fuZx 이거 어때?')).toBe(
      'https://s.zigzag.kr/XWnpU1fuZx'
    );
  });

  it('URL 이 여러 개면 첫 번째만 쓴다', () => {
    expect(extractUrlFromText('https://a.com/first https://b.com/second')).toBe(
      'https://a.com/first'
    );
  });

  it('문장에 섞이면서 따라붙은 구두점은 URL 에서 떼어낸다', () => {
    expect(extractUrlFromText('이거(https://a.com/b) 봐봐')).toBe('https://a.com/b');
    expect(extractUrlFromText('여기야 https://a.com/b.')).toBe('https://a.com/b');
  });

  it('URL 안쪽의 점은 남긴다', () => {
    expect(extractUrlFromText('문장 끝 https://a.com/path.html.')).toBe('https://a.com/path.html');
    expect(extractUrlFromText('https://a.com/search?q=a,b')).toBe('https://a.com/search?q=a,b');
  });

  it('http 와 대문자 스킴도 인식한다', () => {
    expect(extractUrlFromText('http://a.com/b')).toBe('http://a.com/b');
    expect(extractUrlFromText('HTTPS://A.COM/B')).toBe('HTTPS://A.COM/B');
  });

  it('URL 이 없으면 null 을 준다', () => {
    expect(extractUrlFromText('링크 없음')).toBeNull();
    expect(extractUrlFromText('')).toBeNull();
  });
});

describe('URL_PATTERN', () => {
  it('공백 없는 단일 URL 만 통과시킨다', () => {
    expect(URL_PATTERN.test('https://a.com/b')).toBe(true);
    expect(URL_PATTERN.test('상품명 https://a.com/b')).toBe(false);
    expect(URL_PATTERN.test('https://a.com/b 설명')).toBe(false);
  });
});
