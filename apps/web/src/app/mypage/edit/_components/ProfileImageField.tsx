'use client';

import { SUPPORTED_IMAGE_MIME_TYPES } from '@piki/core';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CameraIconFill } from '@/assets/icons';
import BaseImage from '@/components/base-image';
import Skeleton from '@/components/skeleton';
import { Z_INDEX } from '@/consts/zIndex';
import { useImagePicker } from '@/hooks/useImagePicker';
import type { UserIdentityTypeT } from '@/types/user';

import { loadImage } from '../_utils/cropImage';
import ProfileImageCropEditor from './ProfileImageCropEditor';

type Props = {
  userIdentityType: UserIdentityTypeT;
  profileImage: string;
  onImageSelect?: (file: File) => void;
};

function ProfileImageField({ userIdentityType, profileImage, onImageSelect }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** 피커에서 고른 원본 object URL — 값이 있으면 크롭 에디터가 열린다 */
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const { openPicker, inputRef, handleInputChange, isPending } = useImagePicker({
    maxCount: 1,
    onSuccess: async files => {
      const [file] = files;
      if (!file) return;

      const url = URL.createObjectURL(file);
      try {
        await loadImage(url);
      } catch {
        URL.revokeObjectURL(url);
        toast.error('지원하지 않는 이미지 형식이에요.');
        return;
      }

      setCropImageSrc(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    },
  });

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  useEffect(
    () => () => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    },
    [cropImageSrc]
  );

  const closeCropEditor = () => {
    setCropImageSrc(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleCropConfirm = (blob: Blob) => {
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    onImageSelect?.(new File([blob], 'profile.jpg', { type: blob.type }));
    closeCropEditor();
  };

  const displayUrl = previewUrl ?? profileImage;

  return (
    <>
      <div className="relative mx-auto size-[90px]">
        {userIdentityType === 'MEMBER' ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={isPending}
            aria-label="프로필 이미지 변경"
            className="relative size-[90px] cursor-pointer"
          >
            <span className="relative block size-[90px] overflow-hidden rounded-full">
              <BaseImage
                src={displayUrl}
                alt="프로필 이미지"
                sizes="90px"
                className="object-cover"
                loadingFallback={<Skeleton shape="circle" className="absolute inset-0" />}
              />
            </span>
            <span
              className="absolute top-[54.5px] left-[59px] flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-layer-default"
              style={{ zIndex: Z_INDEX.BASE_IMAGE + 1 }}
            >
              <CameraIconFill className="size-6 shrink-0 text-icon-neutral-secondary" />
            </span>
          </button>
        ) : (
          <div className="relative size-[90px] overflow-hidden rounded-full">
            <BaseImage
              src={displayUrl}
              alt="프로필 이미지"
              sizes="90px"
              className="object-cover"
              loadingFallback={<Skeleton shape="circle" className="absolute inset-0" />}
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_IMAGE_MIME_TYPES.join(', ')}
        className="hidden"
        onChange={handleInputChange}
      />

      {cropImageSrc && (
        <ProfileImageCropEditor
          imageSrc={cropImageSrc}
          onCancel={closeCropEditor}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  );
}

export default ProfileImageField;
