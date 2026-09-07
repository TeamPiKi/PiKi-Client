'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import { toast } from 'sonner';

import { ReloaderIconOutline } from '@/assets/icons';
import BottomCta from '@/components/bottom-cta';
import Button from '@/components/button';
import { Header, HeaderIcon } from '@/components/header';
import { Z_INDEX } from '@/consts/zIndex';

import { cropImage } from '../_utils/cropImage';

const ROTATION_STEP_DEGREE = 90;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type ProfileImageCropEditorProps = {
  /** 크롭할 원본 이미지 object URL */
  imageSrc: string;
  onCancel: () => void;
  /** 확인 시 크롭·회전이 적용된 JPEG Blob 전달 */
  onConfirm: (blob: Blob) => void;
};

/** 피커 선택 직후 화면 전체를 덮는 크롭·회전 에디터 */
function ProfileImageCropEditor({ imageSrc, onCancel, onConfirm }: ProfileImageCropEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 처리 중 취소를 막는다 — 에디터가 먼저 닫히면 뒤늦게 완료된 onConfirm 이 취소한 이미지를 적용해버린다
  const handleCancel = () => {
    if (isProcessing) return;
    onCancel();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isProcessing]);

  const handleRotate = () => setRotation(prev => (prev + ROTATION_STEP_DEGREE) % 360);

  const handleCropComplete = (_croppedArea: Area, nextCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels || isProcessing) return;

    setIsProcessing(true);
    try {
      const blob = await cropImage(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob);
    } catch {
      toast.error('이미지 처리 중 오류가 발생했어요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="프로필 이미지 편집"
      className="fixed inset-0 mx-auto flex w-full max-w-120 flex-col bg-bg-layer-basement pt-padding-top"
      style={{ zIndex: Z_INDEX.DIALOG }}
    >
      <div className="px-5">
        <Header
          left={<HeaderIcon name="BACK" className="size-7.5" onClick={handleCancel} />}
          center={<h1 className="heading-1-bold text-text-neutral-primary">프로필 이미지 편집</h1>}
        />
      </div>

      <div className="relative mt-6 min-h-0 flex-1 touch-none bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          aspect={1}
          cropShape="round"
          showGrid={false}
          objectFit="cover"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="mb-bottom-cta flex items-center gap-4 px-5 py-4">
        <button
          type="button"
          onClick={handleRotate}
          disabled={isProcessing}
          aria-label="이미지 90도 회전"
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-icon-neutral-secondary active:bg-gray-50"
        >
          <ReloaderIconOutline className="size-6 shrink-0" />
        </button>
        {/* 줌 슬라이더는 핀치줌이 없는 마우스 환경에서만 노출 — 터치는 핀치줌으로 조작 */}
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={event => setZoom(Number(event.target.value))}
          aria-label="이미지 확대/축소"
          className="hidden w-full cursor-pointer accent-black pointer-fine:block"
        />
      </div>

      <BottomCta>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleConfirm}
          isLoading={isProcessing}
          disabled={!croppedAreaPixels || isProcessing}
        >
          완료
        </Button>
      </BottomCta>
    </div>,
    document.body
  );
}

export default ProfileImageCropEditor;
