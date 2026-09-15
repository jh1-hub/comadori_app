export const TARGET_WIDTH = 720;
export const TARGET_HEIGHT = 480;

export interface CaptureFrameOptions {
  mirrorH?: boolean;
  mirrorV?: boolean;
}

/**
 * Captures the current frame from a video element, scales and center-crops it to exactly 720x480,
 * with optional horizontal and vertical mirroring, and returns it as a JPEG Blob.
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  options?: CaptureFrameOptions
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  const vWidth = video.videoWidth || 640;
  const vHeight = video.videoHeight || 480;

  // Center cover crop calculation
  const targetAspect = TARGET_WIDTH / TARGET_HEIGHT; // 1.5
  const videoAspect = vWidth / vHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = vWidth;
  let sHeight = vHeight;

  if (videoAspect > targetAspect) {
    // Video is wider than target -> crop left and right
    sWidth = vHeight * targetAspect;
    sx = (vWidth - sWidth) / 2;
  } else {
    // Video is taller than target -> crop top and bottom
    sHeight = vWidth / targetAspect;
    sy = (vHeight - sHeight) / 2;
  }

  ctx.save();
  // Apply horizontal and vertical flip if requested
  const mirrorH = !!options?.mirrorH;
  const mirrorV = !!options?.mirrorV;

  if (mirrorH || mirrorV) {
    ctx.translate(mirrorH ? TARGET_WIDTH : 0, mirrorV ? TARGET_HEIGHT : 0);
    ctx.scale(mirrorH ? -1 : 1, mirrorV ? -1 : 1);
  }

  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate image blob'));
        }
      },
      'image/jpeg',
      0.85
    );
  });
}

/**
 * Processes an uploaded image file, resizes and crops it to 720x480 according to requirements,
 * and returns a JPEG Blob.
 */
export async function processUploadedImage(file: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
      const imgAspect = imgWidth / imgHeight;

      let sx = 0;
      let sy = 0;
      let sWidth = imgWidth;
      let sHeight = imgHeight;

      if (imgAspect > targetAspect) {
        // Image is wider -> crop sides
        sWidth = imgHeight * targetAspect;
        sx = (imgWidth - sWidth) / 2;
      } else {
        // Image is taller -> crop top and bottom
        sHeight = imgWidth / targetAspect;
        sy = (imgHeight - sHeight) / 2;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to encode image'));
          }
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file'));
    };

    img.src = objectUrl;
  });
}
