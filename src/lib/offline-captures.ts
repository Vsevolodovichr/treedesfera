import { createStore, del, get, set } from 'idb-keyval';
import { uploadTourPhoto } from './api';
import { getAccessToken } from '../integrations/xatosfera/client';

export const CAPTURE_SYNC_TAG = 'xatosfera-capture-upload-sync';
export const CAPTURE_QUEUE_CHANGED_EVENT = 'xatosfera-capture-queue-changed';

const CAPTURE_DB_NAME = 'xatosfera-capture';
const CAPTURE_STORE_NAME = 'captures';
const CAPTURE_QUEUE_KEY = 'pending-captures';
const captureStore = createStore(CAPTURE_DB_NAME, CAPTURE_STORE_NAME);

export interface QueuedCapture {
  id: string;
  propertyId: string;
  roomId: string;
  photoType: string;
  qualityScore?: number;
  blob: Blob;
  fileName: string;
  createdAt: number;
  accessToken?: string | null;
}

export interface QueueCaptureInput {
  propertyId: string;
  roomId: string;
  photoType: string;
  qualityScore?: number;
  blob: Blob;
}

type SyncRegistration = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
};

function emitQueueChanged(count: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CAPTURE_QUEUE_CHANGED_EVENT, { detail: { count } }));
}

export async function getQueuedCaptures() {
  const captures = await get<QueuedCapture[]>(CAPTURE_QUEUE_KEY, captureStore);
  return Array.isArray(captures) ? captures : [];
}

export async function getQueuedCaptureCount() {
  return (await getQueuedCaptures()).length;
}

export async function requestCaptureUploadSync() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = (await navigator.serviceWorker.ready) as SyncRegistration;
    if (registration.sync) await registration.sync.register(CAPTURE_SYNC_TAG);
  } catch {
    return;
  }
}

export async function queueCapture(input: QueueCaptureInput) {
  const captures = await getQueuedCaptures();
  const id = `capture_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const queued: QueuedCapture = {
    id,
    propertyId: input.propertyId,
    roomId: input.roomId,
    photoType: input.photoType,
    qualityScore: input.qualityScore,
    blob: input.blob,
    fileName: `${id}.jpg`,
    createdAt: Date.now(),
    accessToken: getAccessToken(),
  };

  await set(CAPTURE_QUEUE_KEY, [...captures, queued], captureStore);
  emitQueueChanged(captures.length + 1);
  await requestCaptureUploadSync();
  return queued;
}

export async function flushQueuedCaptures() {
  const captures = await getQueuedCaptures();
  if (captures.length === 0) {
    emitQueueChanged(0);
    return { uploaded: 0, remaining: 0 };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await requestCaptureUploadSync();
    emitQueueChanged(captures.length);
    return { uploaded: 0, remaining: captures.length };
  }

  const remaining: QueuedCapture[] = [];
  let uploaded = 0;

  for (const capture of captures) {
    try {
      const file = new File([capture.blob], capture.fileName, { type: capture.blob.type || 'image/jpeg' });
      await uploadTourPhoto(capture.propertyId, file, {
        room_id: capture.roomId,
        photo_type: capture.photoType,
        quality_score: capture.qualityScore,
      });
      uploaded += 1;
    } catch {
      remaining.push(capture);
    }
  }

  if (remaining.length > 0) {
    await set(CAPTURE_QUEUE_KEY, remaining, captureStore);
    await requestCaptureUploadSync();
  } else {
    await del(CAPTURE_QUEUE_KEY, captureStore);
  }

  emitQueueChanged(remaining.length);
  return { uploaded, remaining: remaining.length };
}

export async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}
