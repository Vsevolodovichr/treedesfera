import { Workbox } from 'workbox-window';
import {
  CAPTURE_QUEUE_CHANGED_EVENT,
  flushQueuedCaptures,
  getQueuedCaptureCount,
  requestCaptureUploadSync,
} from './lib/offline-captures';

type CaptureQueueMessage = {
  type: 'CAPTURE_QUEUE_CHANGED';
  count: number;
};

function isCaptureQueueMessage(data: unknown): data is CaptureQueueMessage {
  return !!data && typeof data === 'object' && 'type' in data && data.type === 'CAPTURE_QUEUE_CHANGED';
}

async function syncPendingCaptures() {
  const count = await getQueuedCaptureCount();
  if (count > 0) await requestCaptureUploadSync();
  if (navigator.onLine) await flushQueuedCaptures();
}

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');

  wb.addEventListener('message', (event) => {
    if (!isCaptureQueueMessage(event.data)) return;
    window.dispatchEvent(new CustomEvent(CAPTURE_QUEUE_CHANGED_EVENT, { detail: { count: event.data.count } }));
  });

  void wb.register().then(() => syncPendingCaptures()).catch(() => undefined);
  window.addEventListener('online', () => {
    void syncPendingCaptures();
  });
}
