type DepthDevice = 'webgpu' | 'wasm';

type WorkerRequest = {
  id: number;
  imageBlob: Blob;
  device: DepthDevice;
};

type WorkerResponse = {
  id: number;
  depthBlob?: Blob;
  error?: string;
  progress?: number;
};

type DepthImage = {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  channels?: number;
};

type DepthResult = {
  depth: DepthImage;
};

type TransformersModule = typeof import('@huggingface/transformers');

let transformersPromise: Promise<TransformersModule> | null = null;
let estimator: ((blob: Blob) => Promise<DepthResult>) | null = null;
let estimatorDevice: DepthDevice | null = null;

const workerSelf = self as unknown as {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

async function getTransformers(): Promise<TransformersModule> {
  transformersPromise ??= import('@huggingface/transformers').then((module) => {
    module.env.allowLocalModels = false;
    module.env.useBrowserCache = true;
    return module;
  });

  return transformersPromise;
}

function postProgress(id: number, value: unknown) {
  const progress =
    typeof value === 'number' ? value :
    value && typeof value === 'object' && 'progress' in value && typeof value.progress === 'number' ? value.progress :
    value && typeof value === 'object' && 'loaded' in value && 'total' in value && typeof value.loaded === 'number' && typeof value.total === 'number' && value.total > 0 ? value.loaded / value.total :
    null;

  if (progress === null) return;
  workerSelf.postMessage({ id, progress: Math.max(0, Math.min(1, progress > 1 ? progress / 100 : progress)) });
}

async function getEstimator(id: number, device: DepthDevice) {
  if (!estimator || estimatorDevice !== device) {
    const { pipeline } = await getTransformers();
    estimator = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', {
      device,
      dtype: 'q8',
      progress_callback: (progress: unknown) => postProgress(id, progress),
    }) as (blob: Blob) => Promise<DepthResult>;
    estimatorDevice = device;
  }

  return estimator;
}

async function resizeToModelInput(imageBlob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(imageBlob);
  const canvas = new OffscreenCanvas(518, 518);
  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('canvas_unavailable');
  }

  context.drawImage(bitmap, 0, 0, 518, 518);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/png' });
}

async function depthToPng(depth: DepthImage): Promise<Blob> {
  const { data, width, height } = depth;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('canvas_unavailable');
  }

  const pixelCount = width * height;
  const channels = depth.channels ?? Math.max(1, Math.floor(data.length / pixelCount));
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  for (let i = 0; i < pixelCount; i += 1) {
    const value = data[i * channels] ?? 0;
    const offset = i * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }

  context.putImageData(new ImageData(rgba, width, height), 0, 0);

  return canvas.convertToBlob({ type: 'image/png' });
}

function getDepthStddev(depth: DepthImage): number {
  const { data, width, height } = depth;
  const pixelCount = width * height;
  const channels = depth.channels ?? Math.max(1, Math.floor(data.length / pixelCount));
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < pixelCount; i += 1) {
    const value = data[i * channels] ?? 0;
    sum += value;
    sumSq += value * value;
  }

  const mean = sum / pixelCount;
  const variance = sumSq / pixelCount - mean * mean;

  return Math.sqrt(Math.max(0, variance));
}

workerSelf.onmessage = async (event) => {
  const { id, imageBlob, device } = event.data;

  try {
    const resizedBlob = await resizeToModelInput(imageBlob);
    const depthEstimator = await getEstimator(id, device);
    const result = await depthEstimator(resizedBlob);
    if (getDepthStddev(result.depth) < 15) {
      workerSelf.postMessage({ id, error: 'low_variance' });
      return;
    }
    const depthBlob = await depthToPng(result.depth);
    workerSelf.postMessage({ id, depthBlob });
  } catch (error) {
    workerSelf.postMessage({ id, error: error instanceof Error ? error.message : 'depth_failed' });
  }
};
