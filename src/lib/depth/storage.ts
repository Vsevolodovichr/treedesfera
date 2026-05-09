import { clear, createStore, del, get, set } from 'idb-keyval';

const depthStore = createStore('xatosfera-capture-depth', 'depth-maps');

export async function putDepth(photoId: string, blob: Blob): Promise<string> {
  await set(photoId, blob, depthStore);
  return URL.createObjectURL(blob);
}

export async function getDepth(photoId: string): Promise<{ blob: Blob; url: string } | null> {
  const blob = await get<Blob>(photoId, depthStore);

  if (!blob) return null;

  return { blob, url: URL.createObjectURL(blob) };
}

export async function deleteDepth(photoId: string): Promise<void> {
  await del(photoId, depthStore);
}

export async function clearAllDepth(): Promise<void> {
  await clear(depthStore);
}
