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

const LOGIN_UPDATE_PROMPT_DELAY_MS = 20_000;
const PWA_UPDATE_PROMPT = 'Доступне оновлення. Оновити застосунок зараз?';

let wb: Workbox | null = null;
let registrationPromise: Promise<ServiceWorkerRegistration | undefined> | null = null;
let updatePromptPending = false;
let updatePromptOpen = false;

function isCaptureQueueMessage(data: unknown): data is CaptureQueueMessage {
  return !!data && typeof data === 'object' && 'type' in data && data.type === 'CAPTURE_QUEUE_CHANGED';
}

async function syncPendingCaptures() {
  const count = await getQueuedCaptureCount();
  if (count > 0) await requestCaptureUploadSync();
  if (navigator.onLine) await flushQueuedCaptures();
}

function promptForUpdate() {
  if (!updatePromptPending || updatePromptOpen) return;
  if (!navigator.serviceWorker.controller) {
    updatePromptPending = false;
    wb?.messageSkipWaiting();
    return;
  }

  updatePromptOpen = true;
  const accepted = window.confirm(PWA_UPDATE_PROMPT);
  updatePromptOpen = false;
  if (!accepted) return;

  updatePromptPending = false;
  wb?.messageSkipWaiting();
}

export function requestPwaUpdatePrompt() {
  if (!('serviceWorker' in navigator)) return;
  void registrationPromise?.then((registration) => registration?.update()).finally(promptForUpdate);
}

export function requestPwaUpdatePromptAfterLogin() {
  requestPwaUpdatePrompt();
  window.setTimeout(requestPwaUpdatePrompt, LOGIN_UPDATE_PROMPT_DELAY_MS);
}

if ('serviceWorker' in navigator) {
  const swUrl = new URL(import.meta.url);
  swUrl.pathname = swUrl.pathname.includes('/assets/')
    ? swUrl.pathname.replace(/\/assets\/[^/]+$/, '/sw.js')
    : '/sw.js';
  wb = new Workbox(swUrl.toString());

  wb.addEventListener('message', (event) => {
    if (!isCaptureQueueMessage(event.data)) return;
    window.dispatchEvent(new CustomEvent(CAPTURE_QUEUE_CHANGED_EVENT, { detail: { count: event.data.count } }));
  });

  wb.addEventListener('waiting', () => {
    updatePromptPending = true;
    promptForUpdate();
  });

  wb.addEventListener('controlling', () => {
    window.location.reload();
  });

  registrationPromise = wb.register().then((registration) => {
    void syncPendingCaptures();
    return registration;
  }).catch(() => undefined);

  window.addEventListener('online', () => {
    void syncPendingCaptures();
  });
}
