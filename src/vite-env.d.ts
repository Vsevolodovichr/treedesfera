/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PUBLIC_TOUR_BASE_URL?: string;
  readonly VITE_DEPTH_ENABLED?: string;
  readonly VITE_PANO_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
