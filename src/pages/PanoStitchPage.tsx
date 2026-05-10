import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, RotateCcw, X } from 'lucide-react';
import { stitchPanorama } from '../lib/pano/client';
import { useStore } from '../store';

export default function PanoStitchPage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { rooms, setPanoramaStatus, setPanoramaResult, setLastPanoStitch, resetPanorama } = useStore();
  const room = rooms.find((item) => item.id === roomId);
  const frameUrls = useMemo(() => room?.panorama?.frameUrls ?? [], [room?.panorama?.frameUrls]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedKeyRef = useRef<string | null>(null);

  const runKey = `${roomId ?? 'unknown'}:${frameUrls.join('|')}:${attempt}`;

  const handleRetry = useCallback(() => {
    startedKeyRef.current = null;
    setProgress(0);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  const handleRetake = useCallback(() => {
    if (roomId) resetPanorama(roomId);
    navigate(`/pano/${roomId}`);
  }, [navigate, resetPanorama, roomId]);

  const handleCancel = useCallback(() => {
    navigate('/rooms');
  }, [navigate]);

  useEffect(() => {
    if (!roomId || !room) {
      navigate('/rooms', { replace: true });
      return;
    }

    if (frameUrls.length < 2) {
      navigate(`/pano/${roomId}`, { replace: true });
      return;
    }

    if (startedKeyRef.current === runKey) return;
    startedKeyRef.current = runKey;

    let cancelled = false;
    const yawStep = 360 / frameUrls.length;
    const frames = frameUrls.map((url, index) => ({ url, yawDeg: index * yawStep }));

    const runStitch = async () => {
      const startedAt = performance.now();
      setProgress(0);
      setError(null);
      setPanoramaStatus(roomId, 'stitching');

      try {
        const result = await stitchPanorama(frames, (value) => {
          if (!cancelled) setProgress(value);
        });
        if (cancelled) return;

        const url = URL.createObjectURL(result.blob);
        setLastPanoStitch({
          durationMs: Math.round(performance.now() - startedAt),
          framesCount: frameUrls.length,
          outputBytes: result.blob.size,
          success: true,
        });
        setPanoramaResult(roomId, url, result.hfov);
        setPanoramaStatus(roomId, 'ready');
        navigate(`/pano/${roomId}/review`, { replace: true });
      } catch (stitchError) {
        if (cancelled) return;
        setLastPanoStitch({
          durationMs: Math.round(performance.now() - startedAt),
          framesCount: frameUrls.length,
          outputBytes: 0,
          success: false,
        });
        setPanoramaStatus(roomId, 'failed');
        setError(stitchError instanceof Error ? stitchError.message : 'pano_stitch_failed');
      }
    };

    void runStitch();

    return () => {
      cancelled = true;
    };
  }, [frameUrls, navigate, room, roomId, runKey, setLastPanoStitch, setPanoramaResult, setPanoramaStatus]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a070d] px-5 py-[max(24px,env(safe-area-inset-top))] text-[#f5f5f5]">
      <div className="flex items-center justify-between">
        <button onClick={handleCancel} className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[15px] font-semibold">{room?.name || 'Кімната'}</p>
          <p className="mt-0.5 text-[11px] text-[#a08fb0]">Стичінг панорами</p>
        </div>
        <div className="h-10 w-10" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {error ? (
          <div className="w-full max-w-[360px] rounded-[16px] border border-[#f87171]/30 bg-[#14101a] p-5">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#f87171]" />
            <p className="text-[16px] font-semibold">Не вдалося зібрати панораму</p>
            <p className="mt-2 text-[12px] leading-5 text-[#b8a8c8]">{error}</p>
            <div className="mt-5 grid gap-2">
              <button onClick={handleRetry} className="h-11 rounded-[12px] bg-[#d4af37] text-[14px] font-semibold text-[#0a070d]">
                <RefreshCw className="mr-2 inline h-4 w-4" />
                Спробувати знову
              </button>
              <button onClick={handleRetake} className="h-11 rounded-[12px] border border-white/10 text-[14px] font-semibold">
                <RotateCcw className="mr-2 inline h-4 w-4" />
                Перезняти
              </button>
              <button onClick={handleCancel} className="h-11 rounded-[12px] text-[14px] font-medium text-[#a08fb0]">
                Скасувати
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[360px]">
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-[#d4af37]" />
            <p className="text-[18px] font-semibold">Збираємо панораму</p>
            <p className="mt-2 text-[12px] text-[#a08fb0]">Оброблено {frameUrls.length} кадрів</p>
            <div className="mt-6 h-3 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#d4af37]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-3 text-[13px] font-medium text-[#d4af37]">{Math.round(progress * 100)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
