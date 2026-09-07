import type { Area } from 'react-easy-crop';

/**
 * 크롭 출력 포맷은 JPEG 고정 — 프로필은 투명도가 필요 없고, HEIC 원본도 여기서 정규화된다.
 * NOTE: presign 의 contentType 은 원본(file.type)이 아니라 반드시 이 출력 타입을 써야 한다.
 * 어긋나면 PUT 바이트와 서명이 달라 서버가 USER-011(형식/내용 불일치)로 거부한다.
 */
const CROP_OUTPUT_MIME_TYPE = 'image/jpeg';
const CROP_OUTPUT_QUALITY = 0.9;
/** 프로필은 원형 90px 노출 — 원본이 커도 출력 한 변이 이 값을 넘지 않게 줄인다 */
const CROP_OUTPUT_MAX_SIZE = 1080;
/**
 * 회전용 중간 canvas 한 변 상한. 5MB 이하 압축 이미지도 수천만 픽셀로 디코드될 수 있어,
 * 원본 크기 그대로 canvas 를 할당하면 웹뷰 메모리를 터뜨릴 수 있다 — 넘으면 축소해 그린다
 */
const MAX_SOURCE_SIZE = 4096;

/** 브라우저가 디코드 못 하는 형식(Chrome/Android WebView 의 HEIC 등)은 여기서 reject 된다 */
export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    image.src = src;
  });

const getRadianAngle = (degree: number) => (degree * Math.PI) / 180;

/** 회전된 이미지 전체를 담는 bounding box 크기 */
const getRotatedSize = (width: number, height: number, rotation: number) => {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

/** 크롭 화면에서 정한 영역·회전을 canvas 로 적용해 JPEG Blob 을 만든다 */
export const cropImage = async (
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation: number
): Promise<Blob> => {
  const image = await loadImage(imageSrc);

  // 원본·크롭 좌표를 같은 비율로 축소해 좌표계를 유지한다 (croppedAreaPixels 는 원본 픽셀 기준)
  const sourceScale = Math.min(1, MAX_SOURCE_SIZE / Math.max(image.width, image.height));
  const sourceWidth = Math.round(image.width * sourceScale);
  const sourceHeight = Math.round(image.height * sourceScale);
  const cropX = croppedAreaPixels.x * sourceScale;
  const cropY = croppedAreaPixels.y * sourceScale;
  const cropWidth = croppedAreaPixels.width * sourceScale;
  const cropHeight = croppedAreaPixels.height * sourceScale;

  const rotatedCanvas = document.createElement('canvas');
  const rotatedCtx = rotatedCanvas.getContext('2d');
  if (!rotatedCtx) throw new Error('CANVAS_CONTEXT_FAILED');

  const { width: boxWidth, height: boxHeight } = getRotatedSize(
    sourceWidth,
    sourceHeight,
    rotation
  );
  rotatedCanvas.width = boxWidth;
  rotatedCanvas.height = boxHeight;

  rotatedCtx.translate(boxWidth / 2, boxHeight / 2);
  rotatedCtx.rotate(getRadianAngle(rotation));
  rotatedCtx.translate(-sourceWidth / 2, -sourceHeight / 2);
  rotatedCtx.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  const outputScale = Math.min(1, CROP_OUTPUT_MAX_SIZE / Math.max(cropWidth, cropHeight));
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.round(cropWidth * outputScale);
  outputCanvas.height = Math.round(cropHeight * outputScale);
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('CANVAS_CONTEXT_FAILED');

  outputCtx.drawImage(
    rotatedCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('CROP_EXPORT_FAILED'))),
      CROP_OUTPUT_MIME_TYPE,
      CROP_OUTPUT_QUALITY
    );
  });
};
