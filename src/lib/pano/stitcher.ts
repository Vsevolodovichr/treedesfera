import { projectFrameToCylinder } from './cylindrical';

type FrameInput = {
  blob: Blob;
  yawDeg: number;
};

type StitchOptions = {
  outWidth?: number;
  outHeight?: number;
  vfovDeg?: number;
  onProgress?: (progress: number) => void;
};

function getYawSpan(frames: FrameInput[], vfovDeg: number) {
  if (frames.length === 0) return vfovDeg;
  const sorted = frames.map((frame) => frame.yawDeg).sort((a, b) => a - b);
  return Math.min(360, Math.max(vfovDeg, sorted[sorted.length - 1] - sorted[0] + vfovDeg));
}

async function bitmapToImageData(bitmap: ImageBitmap): Promise<ImageData> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('canvas_unavailable');
  }

  context.drawImage(bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();

  return imageData;
}

function blendImageData(base: ImageData, weight: Float32Array, overlay: ImageData) {
  const baseData = base.data;
  const overlayData = overlay.data;

  for (let i = 0, p = 0; i < overlayData.length; i += 4, p += 1) {
    const alpha = overlayData[i + 3] / 255;
    if (alpha <= 0) continue;

    const currentWeight = weight[p];
    const nextWeight = currentWeight + alpha;
    baseData[i] = (baseData[i] * currentWeight + overlayData[i] * alpha) / nextWeight;
    baseData[i + 1] = (baseData[i + 1] * currentWeight + overlayData[i + 1] * alpha) / nextWeight;
    baseData[i + 2] = (baseData[i + 2] * currentWeight + overlayData[i + 2] * alpha) / nextWeight;
    baseData[i + 3] = 255;
    weight[p] = nextWeight;
  }
}

export async function stitchCylindrical(
  frames: FrameInput[],
  opts: StitchOptions = {},
): Promise<{ blob: Blob; hfov: number }> {
  if (frames.length === 0) {
    throw new Error('no_frames');
  }

  const outWidth = opts.outWidth ?? 4096;
  const outHeight = opts.outHeight ?? 2048;
  const vfovDeg = opts.vfovDeg ?? 60;
  const targetCanvas = new OffscreenCanvas(outWidth, outHeight);
  const targetContext = targetCanvas.getContext('2d');

  if (!targetContext) {
    throw new Error('canvas_unavailable');
  }

  const targetImage = targetContext.createImageData(outWidth, outHeight);
  const weight = new Float32Array(outWidth * outHeight);

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const bitmap = await createImageBitmap(frame.blob);
    const imageData = await bitmapToImageData(bitmap);
    const focalPx = (imageData.height / 2) / Math.tan((vfovDeg * Math.PI / 180) / 2);
    const projected = projectFrameToCylinder(imageData, focalPx, outWidth, outHeight, frame.yawDeg);
    const projectedContext = projected.canvas.getContext('2d');

    if (!projectedContext) {
      throw new Error('canvas_unavailable');
    }

    blendImageData(targetImage, weight, projectedContext.getImageData(0, 0, outWidth, outHeight));
    opts.onProgress?.((index + 1) / frames.length);
  }

  targetContext.putImageData(targetImage, 0, 0);
  const blob = await targetCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });

  return { blob, hfov: getYawSpan(frames, vfovDeg) };
}
