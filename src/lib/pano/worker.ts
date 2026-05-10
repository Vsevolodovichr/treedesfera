import { stitchCylindrical } from './stitcher';

type WorkerFrame = {
  blob: Blob;
  yawDeg: number;
};

type WorkerRequest = {
  id: number;
  frames: WorkerFrame[];
};

type WorkerResponse = {
  id: number;
  blob?: Blob;
  hfov?: number;
  error?: string;
  progress?: number;
};

const workerSelf = self as unknown as {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

workerSelf.onmessage = async (event) => {
  const { id, frames } = event.data;

  try {
    const result = await stitchCylindrical(frames, {
      onProgress: (progress) => workerSelf.postMessage({ id, progress }),
    });
    workerSelf.postMessage({ id, blob: result.blob, hfov: result.hfov });
  } catch (error) {
    workerSelf.postMessage({ id, error: error instanceof Error ? error.message : 'pano_stitch_failed' });
  }
};
