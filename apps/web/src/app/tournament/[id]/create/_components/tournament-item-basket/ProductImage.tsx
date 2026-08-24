'use client';

import { WarningIconFill } from '@/assets/icons';
import BaseImage from '@/components/base-image';
import Spinner from '@/components/spinner';
import { ITEM_STATUS } from '@/consts/item';
import type { ItemStatusT } from '@/types/item';
import { cn } from '@/utils/cn';

type ProductImageProps = {
  src?: string;
  alt: string;
  status?: ItemStatusT;
};

const loadingFallback = (
  <div className="absolute inset-[3px] flex items-center justify-center">
    <Spinner />
  </div>
);

const errorFallback = (status: ItemStatusT<'FAILED' | 'INCOMPLETE'> = 'FAILED') => (
  <div className="absolute inset-0 flex items-center justify-center">
    <WarningIconFill
      className={cn(
        'size-7.5',
        status === 'FAILED' && 'text-red-300',
        status === 'INCOMPLETE' && 'text-icon-warning'
      )}
      aria-hidden
    />
  </div>
);

function ProductImage({ src, alt, status }: ProductImageProps) {
  const isProcessing = status === ITEM_STATUS.PENDING || status === ITEM_STATUS.PROCESSING;
  const isError = status === ITEM_STATUS.FAILED || status === ITEM_STATUS.INCOMPLETE;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[16px] border-[2px] border-white bg-gray-50 shadow-[0_0_8px_rgba(0,0,0,0.16)]">
      {isProcessing && loadingFallback}
      {isError && errorFallback(status)}
      {!isProcessing && !isError && src && (
        <BaseImage
          src={src}
          alt={alt}
          sizes="68px"
          className="object-cover"
          loadingFallback={loadingFallback}
        />
      )}
    </div>
  );
}

export default ProductImage;
