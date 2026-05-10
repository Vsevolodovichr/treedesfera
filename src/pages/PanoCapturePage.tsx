import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, X, AlertCircle, Camera, RotateCw } from 'lucide-react';
import { useStore } from '../store';

type CameraPermissionState = PermissionState | 'unknown';
type OrientationPermissionState = 'unknown' | 'required' | 'granted' | 'denied' | 'unsupported';
type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const FRAME_COUNT = 8;
const TARGET_TOLERANCE = 5;
const HOLD_MS = 600;

function getInitialOrientationPermission(): OrientationPermissionState {
  const orientationEvent = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission | undefined;
  if (!orientationEvent) return 'unsupported';
  return typeof orientationEvent.requestPermission === 'function' ? 'required' : 'granted';
}

function angleDistance(a: number, b: number) {
  return Math.abs((((a - b + 540) % 360) - 180));
}

export default function PanoCapturePage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const { rooms, startPanoramaCapture, addPanoramaFrame, setPanoramaStatus, resetPanorama } = useStore();
  const room = rooms.find((r) => r.id === roomId);
  const frameUrls = room?.panorama?.frameUrls ?? [];
  const isContinuing = searchParams.get('continue') === '1';
  const targets = useMemo(() => Array.from({ length: FRAME_COUNT }, (_, i) => i * (360 / FRAME_COUNT)), []);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionState>('unknown');
  const [orientationPermission, setOrientationPermission] = useState<OrientationPermissionState>(getInitialOrientationPermission);
  const [heading, setHeading] = useState(0);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const captureBusyRef = useRef(false);

  const nextTarget = targets.find((_, index) => index >= frameUrls.length) ?? null;
  const isGuided = orientationPermission === 'granted';
  const isAligned = nextTarget !== null && isGuided && angleDistance(heading, nextTarget) <= TARGET_TOLERANCE;
  const holdingTarget = isAligned ? nextTarget : null;
  const progress = isGuided ? heading / 360 : frameUrls.length / FRAME_COUNT;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPermission('denied');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraPermission('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch {
      setCameraPermission('denied');
    }
  }, [stopCamera]);

  const captureFrame = useCallback(() => {
    if (captureBusyRef.current || !roomId || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    captureBusyRef.current = true;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        addPanoramaFrame(roomId, URL.createObjectURL(blob));
      }
      window.setTimeout(() => {
        captureBusyRef.current = false;
      }, 250);
    }, 'image/jpeg', 0.9);
  }, [addPanoramaFrame, roomId]);

  useEffect(() => {
    if (!roomId || !room) {
      navigate('/rooms', { replace: true });
      return;
    }
    if (!room.panorama || (!isContinuing && room.panorama.status === 'ready')) {
      startPanoramaCapture(roomId);
      return;
    }
    if (isContinuing && room.panorama.status !== 'capturing') {
      setPanoramaStatus(roomId, 'capturing');
    }
  }, [isContinuing, navigate, room, roomId, setPanoramaStatus, startPanoramaCapture]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startCamera();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (orientationPermission !== 'granted') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.alpha === 'number') {
        setHeading((event.alpha + 360) % 360);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, [orientationPermission]);

  useEffect(() => {
    if (!isAligned || nextTarget === null || frameUrls.length >= FRAME_COUNT) {
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      return;
    }

    if (!holdTimerRef.current) {
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        captureFrame();
      }, HOLD_MS);
    }

    return () => {
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [captureFrame, frameUrls.length, isAligned, nextTarget]);

  const handleEnableGyro = async () => {
    const orientationEvent = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission | undefined;
    if (!orientationEvent) {
      setOrientationPermission('unsupported');
      return;
    }
    if (typeof orientationEvent.requestPermission === 'function') {
      const result = await orientationEvent.requestPermission();
      setOrientationPermission(result === 'granted' ? 'granted' : 'denied');
      return;
    }
    setOrientationPermission('granted');
  };

  const handleCancel = () => {
    if (roomId) resetPanorama(roomId);
    stopCamera();
    navigate('/rooms');
  };

  const handleDone = () => {
    stopCamera();
    navigate(`/pano/${roomId}/stitch`);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black text-white">
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {!stream && (
        <div className="absolute inset-0 bg-[#0a070d] flex items-center justify-center">
          <Camera className="w-12 h-12 text-[#d4af37]" />
        </div>
      )}

      {flash && <div className="absolute inset-0 z-[60] bg-white" />}

      <div className="absolute inset-x-0 top-0 z-50 bg-gradient-to-b from-black/75 to-transparent px-4 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <button onClick={handleCancel} className="w-10 h-10 rounded-full bg-black/35 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[14px] font-semibold">{room?.name || 'Кімната'}</p>
            <p className="mt-0.5 text-[11px] text-white/70">Панорама 360°</p>
          </div>
          <div className="rounded-full bg-black/35 px-3 py-1.5 text-[13px] font-medium">
            {frameUrls.length} / {FRAME_COUNT}
          </div>
        </div>
      </div>

      <div className="absolute left-4 right-4 top-24 z-40 rounded-[16px] border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-lg">
        <div className="mb-3 flex items-center justify-between text-[12px] text-white/75">
          <span>{isGuided ? 'Поверніться до позначки' : 'Ручний режим'}</span>
          <span>{isGuided ? `${Math.round(heading)}°` : 'крок 45°'}</span>
        </div>
        <div className="relative h-4 rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#d4af37]" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          {targets.map((target, index) => (
            <div
              key={target}
              className={`absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded-full ${
                index < frameUrls.length ? 'bg-[#4ade80]' : target === nextTarget && isAligned ? 'bg-[#4ade80]' : 'bg-white'
              }`}
              style={{ left: `calc(${(target / 360) * 100}% - 2px)` }}
            />
          ))}
        </div>
      </div>

      <div className={`absolute inset-8 z-[35] rounded-[24px] border-2 pointer-events-none ${isAligned ? 'border-[#4ade80]' : 'border-white/20'}`} />

      <div className="absolute left-4 right-4 top-44 z-40 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-[13px] font-medium backdrop-blur-sm">
          {holdingTarget !== null ? (
            <>
              <Check className="w-4 h-4 text-[#4ade80]" />
              Тримайте
            </>
          ) : isGuided && nextTarget !== null ? (
            <>
              <RotateCw className="w-4 h-4 text-[#d4af37]" />
              Ціль {Math.round(nextTarget)}°
            </>
          ) : (
            'Поверніться приблизно на 45° і натисніть'
          )}
        </div>
      </div>

      {cameraPermission === 'denied' && (
        <div className="absolute inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-[16px] border border-[#f87171]/30 bg-[#14101a]/95 p-5 text-center">
          <AlertCircle className="mx-auto mb-3 h-7 w-7 text-[#f87171]" />
          <p className="text-[15px] font-semibold">Доступ до камери заблоковано</p>
          <button onClick={() => void startCamera()} className="mt-4 h-10 rounded-[12px] bg-[#d4af37] px-4 text-[13px] font-semibold text-[#0a070d]">
            Спробувати ще раз
          </button>
        </div>
      )}

      {orientationPermission === 'required' && (
        <button
          onClick={handleEnableGyro}
          className="absolute bottom-36 left-1/2 z-50 h-10 -translate-x-1/2 rounded-full bg-[#d4af37] px-4 text-[13px] font-semibold text-[#0a070d]"
        >
          Увімкнути гіроскоп
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 z-50 bg-gradient-to-t from-black/85 to-transparent px-6 pt-16 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={captureFrame}
            disabled={cameraPermission === 'denied'}
            className="h-12 rounded-[12px] border border-white/15 bg-black/45 px-4 text-[13px] font-semibold disabled:opacity-50"
          >
            Кадр
          </button>
          <button
            onClick={captureFrame}
            disabled={cameraPermission === 'denied'}
            className="relative h-[72px] w-[72px] rounded-full active:scale-95 disabled:opacity-50"
          >
            <span className="absolute inset-0 rounded-full border-4 border-[#d4af37]" />
            <span className="absolute inset-3 rounded-full bg-white" />
          </button>
          <button
            onClick={handleDone}
            disabled={frameUrls.length < 6}
            className="h-12 rounded-[12px] bg-[#d4af37] px-4 text-[13px] font-semibold text-[#0a070d] disabled:opacity-45"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
