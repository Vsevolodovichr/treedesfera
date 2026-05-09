import { useEffect, useState } from 'react';
import { disposeDepthWorker, estimateDepth } from '../lib/depth/client';
import { getDepth, putDepth } from '../lib/depth/storage';
import { useStore } from '../store';

export default function DevDepthPage() {
  const deviceCaps = useStore((state) => state.deviceCaps);
  const [file, setFile] = useState<File | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storageStatus, setStorageStatus] = useState('');

  useEffect(() => {
    return () => {
      disposeDepthWorker();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const handleEstimate = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setProgress(0);

    try {
      const depthBlob = await estimateDepth(file, {
        device: deviceCaps?.webgpu ? 'webgpu' : 'wasm',
        onProgress: setProgress,
      });
      const nextUrl = URL.createObjectURL(depthBlob);
      setResultBlob(depthBlob);
      setResultUrl(nextUrl);
      setProgress(1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Depth estimation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resultBlob) return;

    await putDepth('test', resultBlob);
    setStorageStatus('Saved photo_test');
  };

  const handleLoad = async () => {
    const storedDepth = await getDepth('test');

    if (!storedDepth) {
      setStorageStatus('photo_test not found');
      return;
    }

    setResultBlob(storedDepth.blob);
    setResultUrl(storedDepth.url);
    setStorageStatus('Loaded photo_test');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4">
        <h1 className="text-xl font-semibold">Depth dev</h1>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        />
        <button
          type="button"
          onClick={handleEstimate}
          disabled={!file || loading}
          className="h-11 rounded-lg bg-[#d4af37] px-4 font-semibold text-black disabled:opacity-50"
        >
          {loading ? 'Estimating...' : 'Estimate'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!resultBlob}
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm disabled:opacity-50"
          >
            Save as photo_test
          </button>
          <button
            type="button"
            onClick={handleLoad}
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm"
          >
            Load photo_test
          </button>
        </div>
        {storageStatus && <p className="text-sm text-[#d4af37]">{storageStatus}</p>}
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[#d4af37]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {resultUrl && <img src={resultUrl} alt="Depth result" className="w-full rounded-lg border border-white/10" />}
      </div>
    </div>
  );
}
