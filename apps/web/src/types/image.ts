export type PresignedImageRequestT = {
  contentType: string;
  contentLength: number;
};

export type PresignedImageResponseT = {
  imageKey: string;
  uploadUrl: string;
  contentType: string;
};
