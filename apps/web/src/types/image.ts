export type PresignedImageRequestT = {
  contentType: string;
  contentLength: number;
};

export type PresignedImageUploadT = {
  imageKey: string;
  uploadUrl: string;
  contentType: string;
};
