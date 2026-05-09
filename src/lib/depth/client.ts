type DepthDevice = 'webgpu' | 'wasm';

type WorkerResponse = {
  id: number;
  depthBlob?: Blob;
  error?: string;
  progress?: number;
};

type DepthJob = {
  id: number;
  blob: Blob;
  device: DepthDevice;
  onProgress?: (progress: number) => void;
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
let activeJob: DepthJob | null = null;
const queue: DepthJob[] = [];

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = handleMessage;
    worker.onerror = (event) => {
      const failedJob = activeJob;
      activeJob = null;
      failedJob?.reject(new Error(event.message || 'depth_worker_failed'));
      runNext();
    };
  }

  return worker;
}

function handleMessage(event: MessageEvent<WorkerResponse>) {
  const message = event.data;

  if (!activeJob || message.id !== activeJob.id) return;

  if (typeof message.progress === 'number') {
    activeJob.onProgress?.(message.progress);
    return;
  }

  const finishedJob = activeJob;
  activeJob = null;

  if (message.depthBlob) {
    finishedJob.resolve(message.depthBlob);
  } else {
    finishedJob.reject(new Error(message.error || 'depth_failed'));
  }

  runNext();
}

function runNext() {
  if (activeJob || queue.length === 0) return;

  activeJob = queue.shift() ?? null;
  if (!activeJob) return;

  getWorker().postMessage({
    id: activeJob.id,
    imageBlob: activeJob.blob,
    device: activeJob.device,
  });
}

export function estimateDepth(
  blob: Blob,
  opts: { device?: DepthDevice; onProgress?: (p: number) => void } = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    queue.push({
      id: nextId,
      blob,
      device: opts.device ?? 'wasm',
      onProgress: opts.onProgress,
      resolve,
      reject,
    });
    nextId += 1;
    runNext();
  });
}

export function disposeDepthWorker(): void {
  const error = new Error('depth_worker_disposed');

  worker?.terminate();
  worker = null;

  activeJob?.reject(error);
  activeJob = null;

  while (queue.length > 0) {
    queue.shift()?.reject(error);
  }
}
