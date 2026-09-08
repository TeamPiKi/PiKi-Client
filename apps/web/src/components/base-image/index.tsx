'use client';

import type { ImageProps } from 'next/image';
import Image from 'next/image';
import type { ReactNode, SyntheticEvent } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { Z_INDEX } from '@/consts/zIndex';
import { cn } from '@/utils/cn';

type ImgEvent = SyntheticEvent<HTMLImageElement>;
type ImageState = 'loading' | 'success' | 'error';

type BaseImageProps = Omit<ImageProps, 'src' | 'fill' | 'sizes'> & {
  src: ImageProps['src'];
  /** 항상 fill 로 렌더하므로 없으면 100vw 로 떨어져 화면 폭짜리 이미지를 받는다 */
  sizes: string;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
};

const getImageSrcKey = (src: ImageProps['src']) => {
  if (typeof src === 'string') return src;
  if (src && 'src' in src) return src.src;
  return '';
};

const getImageStateFromElement = (img: HTMLImageElement): ImageState => {
  if (!img.complete) return 'loading';
  if (img.naturalWidth === 0) return 'error';
  return 'success';
};

function BaseImage({
  src,
  alt,
  loadingFallback,
  errorFallback,
  onLoad,
  onError,
  className,
  preload = false,
  unoptimized = false,
  ...imageProps
}: BaseImageProps) {
  const [state, setState] = useState<ImageState>('loading');
  const imgRef = useRef<HTMLImageElement>(null);
  const srcKey = getImageSrcKey(src);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    setState(getImageStateFromElement(img));
  }, [srcKey]);

  const handleLoad = (event: ImgEvent) => {
    setState('success');
    onLoad?.(event);
  };

  const handleError = (event: ImgEvent) => {
    setState('error');
    onError?.(event);
  };

  const isImageVisible = state === 'success';
  const showLoadingFallback = loadingFallback != null && state !== 'error';

  return (
    <>
      {showLoadingFallback && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-0 transition-opacity duration-200',
            isImageVisible ? 'opacity-0' : 'opacity-100'
          )}
          aria-hidden={isImageVisible}
        >
          {loadingFallback}
        </div>
      )}
      {state === 'error' && errorFallback && (
        <div className="pointer-events-none absolute inset-0 z-0">{errorFallback}</div>
      )}
      <Image
        {...imageProps}
        key={srcKey}
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        preload={preload}
        unoptimized={unoptimized}
        onLoad={handleLoad}
        onError={handleError}
        style={{ zIndex: Z_INDEX.BASE_IMAGE }}
        className={cn(
          'transition-opacity duration-200',
          preload || isImageVisible ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    </>
  );
}

export default BaseImage;
