import JSZip from 'jszip';
import { FrameItem } from '../types';
import { TARGET_WIDTH, TARGET_HEIGHT } from './imageProcessing';

export interface ExportProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

/**
 * Creates a video (WebM or MP4) from the given frames at the specified FPS.
 */
export async function exportVideo(
  frames: FrameItem[],
  fps: number,
  onProgress: (progress: ExportProgress) => void
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  if (frames.length === 0) {
    throw new Error('フレームがありません');
  }

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Pre-load all images as HTMLImageElements
  onProgress({ current: 0, total: frames.length, percentage: 0, status: '画像を準備中...' });
  const loadedImages: HTMLImageElement[] = [];
  for (let i = 0; i < frames.length; i++) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load frame ${i + 1}`));
      image.src = frames[i].url;
    });
    loadedImages.push(img);
    onProgress({
      current: i + 1,
      total: frames.length,
      percentage: Math.round(((i + 1) / frames.length) * 40),
      status: `画像を準備中 (${i + 1}/${frames.length})...`,
    });
  }

  // Determine supported mimeType
  let selectedMime = 'video/webm;codecs=vp9';
  let ext = 'webm';
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
    selectedMime = 'video/mp4;codecs=avc1';
    ext = 'mp4';
  } else if (MediaRecorder.isTypeSupported('video/mp4')) {
    selectedMime = 'video/mp4';
    ext = 'mp4';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    selectedMime = 'video/webm;codecs=vp9';
    ext = 'webm';
  } else if (MediaRecorder.isTypeSupported('video/webm')) {
    selectedMime = 'video/webm';
    ext = 'webm';
  }

  // Draw first frame
  ctx.drawImage(loadedImages[0], 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  const stream = canvas.captureStream(fps);
  const recordedChunks: Blob[] = [];

  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 4_000_000, // 4Mbps for crisp quality
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<{ blob: Blob; filename: string; mimeType: string }>((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(recordedChunks, { type: selectedMime });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      resolve({
        blob: finalBlob,
        filename: `komadori_${timestamp}.${ext}`,
        mimeType: selectedMime,
      });
    };
    recorder.onerror = (err) => reject(err);
  });

  recorder.start();

  const frameDurationMs = 1000 / fps;

  // Render each frame in sequence onto the canvas
  for (let i = 0; i < loadedImages.length; i++) {
    ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    ctx.drawImage(loadedImages[i], 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    onProgress({
      current: i + 1,
      total: frames.length,
      percentage: 40 + Math.round(((i + 1) / frames.length) * 55),
      status: `動画をエンコード中 (${i + 1}/${frames.length}コマ)...`,
    });

    await new Promise((r) => setTimeout(r, frameDurationMs));
  }

  // Hold the last frame for a tiny moment so it doesn't get clipped
  await new Promise((r) => setTimeout(r, Math.max(150, frameDurationMs)));

  onProgress({
    current: frames.length,
    total: frames.length,
    percentage: 100,
    status: '動画ファイルを書き出し中...',
  });

  recorder.stop();
  return recordingPromise;
}

/**
 * Packs all frames into a ZIP file and downloads it.
 */
export async function exportZip(
  frames: FrameItem[],
  onProgress: (progress: ExportProgress) => void
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();
  const folder = zip.folder('komadori_frames');

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const frameNumber = String(i + 1).padStart(3, '0');
    const filename = `frame_${frameNumber}.jpg`;
    folder?.file(filename, frame.blob);

    onProgress({
      current: i + 1,
      total: frames.length,
      percentage: Math.round(((i + 1) / frames.length) * 90),
      status: `ZIP圧縮中 (${i + 1}/${frames.length}コマ)...`,
    });
  }

  const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    onProgress({
      current: frames.length,
      total: frames.length,
      percentage: 90 + Math.round(metadata.percent * 0.1),
      status: 'ZIPファイルを生成中...',
    });
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    blob: content,
    filename: `komadori_frames_${timestamp}.zip`,
  };
}

/**
 * Triggers a browser file download for any Blob.
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
