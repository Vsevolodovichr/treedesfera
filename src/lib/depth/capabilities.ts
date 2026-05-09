export type DeviceCaps = { webgpu: boolean; wasm: boolean; recommendation: 'on' | 'off' | 'manual' };

type NavigatorWithGPU = Navigator & {
  gpu?: {
    requestAdapter: () => Promise<unknown | null>;
  };
};

export async function probeDepthSupport(): Promise<DeviceCaps> {
  const wasm = true;

  if (import.meta.env.VITE_DEPTH_ENABLED === 'false') {
    return { webgpu: false, wasm, recommendation: 'off' };
  }

  const gpu = 'gpu' in navigator ? (navigator as NavigatorWithGPU).gpu : undefined;
  const adapter = gpu ? await gpu.requestAdapter().catch(() => null) : null;
  const webgpu = !!adapter;

  return { webgpu, wasm, recommendation: webgpu ? 'on' : 'manual' };
}
