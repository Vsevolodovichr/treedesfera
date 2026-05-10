type WorkerFrame = {
  blob: Blob;
  yawDeg: number;
};

type WorkerResponse = {
  id: number;
  blob?: Blob;
  hfov?: number;
  error?: string;
  progress?: number;
};

type PanoJob = {
  id: number;
  frames: WorkerFrame[];
  onProgress?: (progress: number) => void;
  resolve: (result: { blob: Blob; hfov: number }) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
let activeJob: PanoJob | null = null;
const queue: PanoJob[] = [];

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = handleMessage;
    worker.onerror = (event) => {
      const failedJob = activeJob;
      activeJob = null;
      failedJob?.reject(new Error(event.message || 'pano_worker_failed'));
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

  if (message.blob && typeof message.hfov === 'number') {
    finishedJob.resolve({ blob: message.blob, hfov: message.hfov });
  } else {
    finishedJob.reject(new Error(message.error || 'pano_stitch_failed'));
  }

  runNext();
}

function runNext() {
  if (activeJob || queue.length === 0) return;

  activeJob = queue.shift() ?? null;
  if (!activeJob) return;

  getWorker().postMessage({
    id: activeJob.id,
    frames: activeJob.frames,
  });
}

async function urlToWorkerFrame(frame: { url: string; yawDeg: number }): Promise<WorkerFrame> {
  const response = await fetch(frame.url);
  if (!response.ok) {
    throw new Error('frame_fetch_failed');
  }

  return {
    blob: await response.blob(),
    yawDeg: frame.yawDeg,
  };
}

export async function stitchPanorama(
  frames: { url: string; yawDeg: number }[],
  onProgress?: (p: number) => void,
): Promise<{ blob: Blob; hfov: number }> {
  const workerFrames = await Promise.all(frames.map(urlToWorkerFrame));

  return new Promise((resolve, reject) => {
    queue.push({
      id: nextId,
      frames: workerFrames,
      onProgress,
      resolve,
      reject,
    });
    nextId += 1;
    runNext();
  });
}

export function disposePanoWorker(): void {
  const error = new Error('pano_worker_disposed');

  worker?.terminate();
  worker = null;

  activeJob?.reject(error);
  activeJob = null;

  while (queue.length > 0) {
    queue.shift()?.reject(error);
  }
}
