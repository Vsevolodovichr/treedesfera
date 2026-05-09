import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { disposeDepthWorker, estimateDepth } from '../lib/depth/client';
import { putDepth } from '../lib/depth/storage';
import { useStore } from '../store';

type DepthBatchStatus = 'idle' | 'loading-model' | 'processing' | 'done' | 'cancelled';

export function useDepthBatch() {
  const rooms = useStore((state) => state.rooms);
  const deviceCaps = useStore((state) => state.deviceCaps);
  const [status, setStatus] = useState<DepthBatchStatus>('idle');
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);

  const targets = useMemo(() => rooms.flatMap((room) =>
    room.active
      ? room.photos
          .filter((photo) => photo.status === 'accepted' && photo.depthStatus !== 'ready' && photo.depthStatus !== 'skipped')
          .map((photo) => ({ roomId: room.id, photo }))
      : []
  ), [rooms]);

  const isProcessing = status === 'loading-model' || status === 'processing';

  useEffect(() => {
    const state = useStore.getState();

    state.rooms.forEach((room) => {
      room.photos.forEach((photo) => {
        if (photo.depthStatus === 'pending') {
          state.setPhotoDepth(room.id, photo.id, { depthUrl: undefined, depthStatus: 'none' });
        }
      });
    });
  }, []);

  const start = useCallback(async () => {
    const state = useStore.getState();
    const runTargets = state.rooms.flatMap((room) =>
      room.active
        ? room.photos
            .filter((photo) => photo.status === 'accepted' && photo.depthStatus !== 'ready' && photo.depthStatus !== 'skipped')
            .map((photo) => ({ roomId: room.id, photo }))
        : []
    );

    cancelledRef.current = false;
    runIdRef.current += 1;
    const runId = runIdRef.current;
    const device = state.deviceCaps?.webgpu ? 'webgpu' : 'wasm';
    const modelLoadStartedAt = performance.now();
    let modelLoadMs = 0;
    let modelLoaded = false;
    let depthSuccess = 0;
    let depthFailed = 0;
    const inferenceTimes: number[] = [];

    setProcessed(0);
    setTotal(runTargets.length);
    setModelLoadProgress(0);

    if (runTargets.length === 0) {
      setStatus('done');
      return;
    }

    runTargets.forEach(({ roomId, photo }) => {
      state.setPhotoDepth(roomId, photo.id, { depthUrl: undefined, depthStatus: 'pending' });
    });

    setStatus('loading-model');

    for (const { roomId, photo } of runTargets) {
      if (cancelledRef.current || runIdRef.current !== runId) break;

      try {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error('photo_fetch_failed');

        if (cancelledRef.current || runIdRef.current !== runId) break;

        const photoBlob = await response.blob();
        const inferenceStartedAt = performance.now();
        const depthBlob = await estimateDepth(photoBlob, {
          device,
          onProgress: (progress) => {
            if (cancelledRef.current || runIdRef.current !== runId) return;
            setModelLoadProgress(progress);
            if (progress >= 1) {
              if (!modelLoaded) {
                modelLoadMs = performance.now() - modelLoadStartedAt;
                modelLoaded = true;
              }
              setStatus('processing');
            }
          },
        });

        if (cancelledRef.current || runIdRef.current !== runId) break;

        setStatus('processing');
        inferenceTimes.push(performance.now() - inferenceStartedAt);
        const depthUrl = await putDepth(photo.id, depthBlob);
        useStore.getState().setPhotoDepth(roomId, photo.id, { depthUrl, depthStatus: 'ready' });
        depthSuccess += 1;
      } catch (error) {
        if (cancelledRef.current || runIdRef.current !== runId) break;
        if (error instanceof Error && error.message === 'low_variance') {
          useStore.getState().setPhotoDepth(roomId, photo.id, { depthUrl: undefined, depthStatus: 'failed' });
        } else {
          useStore.getState().setPhotoDepth(roomId, photo.id, { depthUrl: undefined, depthStatus: 'failed' });
        }
        depthFailed += 1;
      }

      setProcessed((value) => value + 1);
    }

    if (runIdRef.current !== runId) return;

    setStatus(cancelledRef.current ? 'cancelled' : 'done');
    if (!cancelledRef.current) {
      const currentState = useStore.getState();
      const depthSkipped = currentState.rooms.reduce((sum, room) => (
        sum + room.photos.filter((photo) => photo.depthStatus === 'skipped').length
      ), 0);
      currentState.setLastDepthRun({
        depthSuccess,
        depthFailed,
        depthSkipped,
        avgInferenceMs: inferenceTimes.length
          ? Math.round(inferenceTimes.reduce((sum, value) => sum + value, 0) / inferenceTimes.length)
          : 0,
        device,
        modelLoadMs: Math.round(modelLoadMs),
      });
    }
  }, []);

  const skip = useCallback(() => {
    cancelledRef.current = true;
    runIdRef.current += 1;
    disposeDepthWorker();

    const state = useStore.getState();
    state.rooms.forEach((room) => {
      if (!room.active) return;

      room.photos.forEach((photo) => {
        const shouldSkip = photo.status === 'accepted'
          && photo.depthStatus !== 'ready'
          && photo.depthStatus !== 'skipped'
          && (isProcessing ? photo.depthStatus === 'pending' : true);

        if (shouldSkip) {
          state.setPhotoDepth(room.id, photo.id, { depthUrl: undefined, depthStatus: 'skipped' });
        }
      });
    });

    setStatus('cancelled');
  }, [isProcessing]);

  return { status, processed, total: total || targets.length, modelLoadProgress, start, skip, isProcessing, device: deviceCaps?.webgpu ? 'webgpu' : 'wasm' };
}
