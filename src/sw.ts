/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & typeof globalThis & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

interface QueuedCapture {
  id: string;
  photoId?: string;
  propertyId: string;
  roomId: string;
  photoType: string;
  qualityScore?: number;
  blob: Blob;
  fileName: string;
  createdAt: number;
  accessToken?: string | null;
}

type SyncEventWithTag = ExtendableEvent & {
  tag: string;
};

const API_URL = (import.meta.env.VITE_API_URL || 'https://api.hatosfera-crm.pp.ua').replace(/\/$/, '');
const API_HOST = new URL(API_URL).hostname;
const CAPTURE_SYNC_TAG = 'xatosfera-capture-upload-sync';
const CAPTURE_DB_NAME = 'xatosfera-capture';
const CAPTURE_STORE_NAME = 'captures';
const CAPTURE_QUEUE_KEY = 'pending-captures';

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const cacheableResponses = new CacheableResponsePlugin({
  statuses: [0, 200],
});

registerRoute(
  ({ url }) => (url.hostname === API_HOST || url.origin === self.location.origin) && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'xatosfera-api',
    networkTimeoutSeconds: 4,
    plugins: [
      cacheableResponses,
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 5,
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    (url.hostname.includes('r2.cloudflarestorage.com') ||
      url.hostname.includes('imagedelivery.net') ||
      url.hostname.includes('cloudflare')),
  new CacheFirst({
    cacheName: 'xatosfera-cloudflare-images',
    plugins: [
      cacheableResponses,
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) => request.destination === 'font' || /^\/room-.*\.jpg$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'xatosfera-static-runtime',
    plugins: [
      cacheableResponses,
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

const photoUploadSync = new BackgroundSyncPlugin('xatosfera-photo-upload-requests', {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ request, url }) => request.method === 'POST' && url.pathname.endsWith('/tour/photos'),
  new NetworkOnly({
    plugins: [photoUploadSync],
  }),
  'POST',
);

function idbRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openCaptureDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(CAPTURE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAPTURE_STORE_NAME)) db.createObjectStore(CAPTURE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readQueuedCaptures() {
  const db = await openCaptureDb();
  try {
    const captures = await idbRequest<QueuedCapture[] | undefined>(
      db.transaction(CAPTURE_STORE_NAME, 'readonly').objectStore(CAPTURE_STORE_NAME).get(CAPTURE_QUEUE_KEY),
    );
    return Array.isArray(captures) ? captures : [];
  } finally {
    db.close();
  }
}

async function writeQueuedCaptures(captures: QueuedCapture[]) {
  const db = await openCaptureDb();
  try {
    const store = db.transaction(CAPTURE_STORE_NAME, 'readwrite').objectStore(CAPTURE_STORE_NAME);
    if (captures.length > 0) {
      await idbRequest(store.put(captures, CAPTURE_QUEUE_KEY));
    } else {
      await idbRequest(store.delete(CAPTURE_QUEUE_KEY));
    }
  } finally {
    db.close();
  }
}

async function notifyQueueCount(count: number) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'CAPTURE_QUEUE_CHANGED', count });
  });
}

async function flushQueuedCaptures() {
  const captures = await readQueuedCaptures();
  if (captures.length === 0) {
    await notifyQueueCount(0);
    return;
  }

  const remaining: QueuedCapture[] = [];

  for (const capture of captures) {
    const formData = new FormData();
    formData.set('file', new File([capture.blob], capture.fileName, { type: capture.blob.type || 'image/jpeg' }));
    formData.set('room_id', capture.roomId);
    if (capture.photoId) formData.set('photo_id', capture.photoId);
    formData.set('photo_type', capture.photoType);
    if (capture.qualityScore !== undefined) formData.set('quality_score', String(capture.qualityScore));

    try {
      const headers = new Headers();
      if (capture.accessToken) headers.set('Authorization', `Bearer ${capture.accessToken}`);
      const response = await fetch(`${API_URL}/api/properties/${encodeURIComponent(capture.propertyId)}/tour/photos`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) remaining.push(capture);
    } catch {
      remaining.push(capture);
    }
  }

  await writeQueuedCaptures(remaining);
  await notifyQueueCount(remaining.length);
}

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEventWithTag;
  if (syncEvent.tag === CAPTURE_SYNC_TAG) syncEvent.waitUntil(flushQueuedCaptures());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data && event.data.type === 'FLUSH_CAPTURE_QUEUE') event.waitUntil(flushQueuedCaptures());
});
