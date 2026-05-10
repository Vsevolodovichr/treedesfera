import { useMemo, useState } from 'react';
import { stitchPanorama } from '../lib/pano/client';

type DevFrame = {
  id: string;
  file: File;
  url: string;
  yawDeg: number;
};

export default function DevPanoPage() {
  const [frames, setFrames] = useState<DevFrame[]>([]);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const canStitch = frames.length >= 2 && !isStitching;
  const previewFrames = useMemo(() => frames.slice().sort((a, b) => a.yawDeg - b.yawDeg), [frames]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const nextFrames = Array.from(files).map((file, index, list) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      file,
      url: URL.createObjectURL(file),
      yawDeg: Math.round(index * (360 / list.length)),
    }));
    setFrames(nextFrames);
    setResultUrl(null);
    setError(null);
    setProgress(0);
  };

  const updateYaw = (id: string, yawDeg: number) => {
    setFrames((current) => current.map((frame) => frame.id === id ? { ...frame, yawDeg } : frame));
  };

  const handleStitch = async () => {
    if (!canStitch) return;
    setIsStitching(true);
    setError(null);
    setResultUrl(null);
    setProgress(0);

    try {
      const result = await stitchPanorama(
        previewFrames.map((frame) => ({ url: frame.url, yawDeg: frame.yawDeg })),
        setProgress,
      );
      setResultUrl(URL.createObjectURL(result.blob));
    } catch (stitchError) {
      setError(stitchError instanceof Error ? stitchError.message : 'pano_stitch_failed');
    } finally {
      setIsStitching(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0a070d] px-4 py-6 text-[#f5f5f5]">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Dev Panorama Stitcher</h1>
          <p className="mt-1 text-sm text-[#a08fb0]">Виберіть 6-8 фото, перевірте yaw і натисніть Stitch.</p>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
          className="block w-full rounded-[12px] border border-white/10 bg-[#14101a] p-3 text-sm"
        />

        {frames.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {previewFrames.map((frame) => (
              <div key={frame.id} className="flex gap-3 rounded-[12px] border border-white/10 bg-[#14101a] p-3">
                <img src={frame.url} alt="" className="h-20 w-28 rounded-[8px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{frame.file.name}</p>
                  <label className="mt-3 block text-xs text-[#a08fb0]">
                    Yaw
                    <input
                      type="number"
                      value={frame.yawDeg}
                      onChange={(event) => updateYaw(frame.id, Number(event.target.value))}
                      className="mt-1 h-9 w-full rounded-[8px] border border-white/10 bg-[#0a070d] px-3 text-sm text-white"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleStitch}
            disabled={!canStitch}
            className="h-11 rounded-[12px] bg-[#d4af37] px-5 text-sm font-semibold text-[#0a070d] disabled:opacity-45"
          >
            {isStitching ? 'Stitching...' : 'Stitch'}
          </button>
          <div className="h-2 flex-1 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#d4af37]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="w-12 text-right text-sm text-[#a08fb0]">{Math.round(progress * 100)}%</span>
        </div>

        {error && <div className="rounded-[12px] border border-[#f87171]/30 bg-[#f87171]/10 p-3 text-sm text-[#f87171]">{error}</div>}

        {resultUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Result</p>
            <img src={resultUrl} alt="Panorama result" className="w-full rounded-[12px] border border-white/10" />
          </div>
        )}
      </div>
    </div>
  );
}
