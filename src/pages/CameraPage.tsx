import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImageIcon, AlertCircle, Check, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { useStore, shotInstructions, qualityMessages } from '../store';
import { analyzeCaptureQuality } from '../lib/capture-quality';
import {
  CAPTURE_QUEUE_CHANGED_EVENT,
  dataUrlToBlob,
  flushQueuedCaptures,
  getQueuedCaptureCount,
  queueCapture,
} from '../lib/offline-captures';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  type: string;
  qualityScore: number;
  status: 'accepted' | 'warning' | 'rejected';
  issues: string[];
}

type CameraPermissionState = PermissionState | 'unknown';
type OrientationPermissionState = 'unknown' | 'required' | 'granted' | 'denied' | 'unsupported';
type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

function getInitialOrientationPermission(): OrientationPermissionState {
  const orientationEvent = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission | undefined;
  if (!orientationEvent) return 'unsupported';
  return typeof orientationEvent.requestPermission === 'function' ? 'required' : 'granted';
}

export default function CameraPage() {
  const navigate = useNavigate();
  const { rooms, currentRoomIndex, property, setCurrentRoomIndex, addPhotoToRoom, updateRoom } = useStore();
  const activeRooms = rooms.filter((r) => r.active);
  const currentRoom = activeRooms[currentRoomIndex] || activeRooms[0];
  
  const [shotIndex, setShotIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [lastCapture, setLastCapture] = useState<CapturedPhoto | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [flash, setFlash] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionState>('unknown');
  const [orientationPermission, setOrientationPermission] = useState<OrientationPermissionState>(getInitialOrientationPermission);
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });
  const [queueCount, setQueueCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'queued' | 'syncing'>('synced');
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const instruction = shotInstructions[shotIndex] || shotInstructions[0];
  const shotPositions = ['ліва точка', 'центр', 'права точка'] as const;
  const positionLabel = shotPositions[capturedPhotos.length % shotPositions.length];
  const levelOffset = Math.max(-28, Math.min(28, tilt.gamma));
  const queueLabel = queueCount > 0 ? `У черзі ${queueCount}` : syncStatus === 'syncing' ? 'Синхронізація' : 'Синхронізовано';

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
      if ('permissions' in navigator && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(status.state);
        status.onchange = () => setCameraPermission(status.state);
        if (status.state === 'denied') return;
      }
    } catch {
      setCameraPermission('unknown');
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      setCameraPermission('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch {
      setCameraPermission('denied');
    }
  }, [stopCamera]);

  const syncPendingCaptures = useCallback(async () => {
    setSyncStatus('syncing');
    const result = await flushQueuedCaptures();
    setQueueCount(result.remaining);
    setSyncStatus(result.remaining > 0 ? 'queued' : 'synced');
    return result;
  }, []);

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
      setTilt({
        beta: event.beta || 0,
        gamma: event.gamma || 0,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [orientationPermission]);

  useEffect(() => {
    const updateQueueCount = async () => {
      const count = await getQueuedCaptureCount();
      setQueueCount(count);
      setSyncStatus(count > 0 ? 'queued' : 'synced');
    };

    const handleQueueChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number }>).detail;
      const count = detail?.count ?? 0;
      setQueueCount(count);
      setSyncStatus(count > 0 ? 'queued' : 'synced');
    };

    const handleOnline = () => {
      void syncPendingCaptures();
    };

    void updateQueueCount();
    window.addEventListener(CAPTURE_QUEUE_CHANGED_EVENT, handleQueueChanged);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener(CAPTURE_QUEUE_CHANGED_EVENT, handleQueueChanged);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingCaptures]);

  const handleEnableLevel = async () => {
    const orientationEvent = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission | undefined;
    if (!orientationEvent) return;
    if (typeof orientationEvent.requestPermission === 'function') {
      const result = await orientationEvent.requestPermission();
      setOrientationPermission(result === 'granted' ? 'granted' : 'denied');
      return;
    }
    setOrientationPermission('granted');
  };

  const capturePhoto = useCallback(() => {
    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    
    // Try to capture from video
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        
        const quality = analyzeCaptureQuality(canvas, tilt);
        
        const photo: CapturedPhoto = {
          id: 'photo_' + Date.now(),
          dataUrl,
          type: instruction.type,
          qualityScore: quality.score,
          status: quality.status,
          issues: quality.issues,
        };
        
        setCapturedPhotos((prev) => [...prev, photo]);
        setLastCapture(photo);
        setShowReview(true);
        
        if (quality.status === 'accepted') {
          setTimeout(() => {
            setShowReview(false);
            if (shotIndex < shotInstructions.length - 1) {
              setShotIndex((prev) => prev + 1);
            }
          }, 1500);
        }
        return;
      }
    }
    
    // Fallback: generate placeholder capture
    const photo: CapturedPhoto = {
      id: 'photo_' + Date.now(),
      dataUrl: `/room-${currentRoom?.type || 'living'}.jpg`,
      type: instruction.type,
      qualityScore: 72,
      status: 'accepted',
      issues: [],
    };
    setCapturedPhotos((prev) => [...prev, photo]);
    setLastCapture(photo);
    setShowReview(true);
    
    setTimeout(() => {
      setShowReview(false);
      if (shotIndex < shotInstructions.length - 1) {
        setShotIndex((prev) => prev + 1);
      }
    }, 1500);
  }, [shotIndex, instruction, currentRoom, tilt]);

  const handleAcceptAnyway = () => {
    setShowReview(false);
    if (shotIndex < shotInstructions.length - 1) {
      setShotIndex((prev) => prev + 1);
    }
  };

  const handleRetake = () => {
    setShowReview(false);
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== lastCapture?.id));
  };

  const handleNextRoom = async () => {
    if (isSavingRoom) return;
    setIsSavingRoom(true);

    // Save photos to room
    capturedPhotos.forEach((photo) => {
      addPhotoToRoom(currentRoom.id, {
        id: photo.id,
        url: photo.dataUrl,
        thumbnail: photo.dataUrl,
        type: photo.type,
        qualityScore: photo.qualityScore,
        status: photo.status,
        issues: photo.issues,
      });
    });
    
    const avgScore = capturedPhotos.length > 0
      ? Math.round(capturedPhotos.reduce((s, p) => s + p.qualityScore, 0) / capturedPhotos.length)
      : 0;
    
    updateRoom(currentRoom.id, {
      status: 'completed',
      photos: capturedPhotos.map((p) => ({
        id: p.id,
        url: p.dataUrl,
        thumbnail: p.dataUrl,
        type: p.type,
        qualityScore: p.qualityScore,
        status: p.status,
        issues: p.issues,
      })),
      qualityScore: avgScore,
    });

    if (property?.id) {
      setSyncStatus('queued');
      try {
        for (const photo of capturedPhotos) {
          const blob = await dataUrlToBlob(photo.dataUrl);
          await queueCapture({
            propertyId: property.id,
            roomId: currentRoom.id,
            photoType: photo.type,
            qualityScore: photo.qualityScore,
            blob,
          });
        }
        await syncPendingCaptures();
      } catch {
        const count = await getQueuedCaptureCount();
        setQueueCount(count);
        setSyncStatus(count > 0 ? 'queued' : 'synced');
      }
    }

    setIsSavingRoom(false);

    if (currentRoomIndex < activeRooms.length - 1) {
      setCurrentRoomIndex(currentRoomIndex + 1);
      setShotIndex(0);
      setCapturedPhotos([]);
      setLastCapture(null);
    } else {
      navigate('/review');
    }
  };

  const handleExit = () => {
    stopCamera();
    navigate('/rooms');
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] overflow-hidden">
      {/* Camera Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Fallback if no camera */}
      {!stream && (
        <div className="absolute inset-0 bg-[#0a070d] flex items-center justify-center">
          <img
            src={`/room-${currentRoom?.type || 'living'}.jpg`}
            alt="Room preview"
            className="w-full h-full object-cover opacity-40"
          />
        </div>
      )}

      {cameraPermission === 'denied' && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-[45] rounded-[16px] border border-[#f87171]/30 bg-[#14101a]/95 p-5 text-center">
          <AlertCircle className="w-7 h-7 text-[#f87171] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-white">Доступ до камери заблоковано</p>
          <p className="text-[12px] leading-5 text-[#b8a8c8] mt-1">Дозвольте камеру в налаштуваннях браузера або продовжуйте з офлайн-заглушкою.</p>
          <button
            onClick={() => void startCamera()}
            className="mt-4 h-10 px-4 rounded-[12px] bg-[#d100d9] text-[#0a070d] text-[13px] font-semibold"
          >
            Спробувати ще раз
          </button>
        </div>
      )}

      {/* Flash Effect */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-white z-[60] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent pt-4 pb-8 px-4">
        <div className="flex items-center justify-between">
          <button onClick={handleExit} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-white">{currentRoom?.name || 'Кімната'}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {queueCount > 0 ? (
                <WifiOff className="w-3 h-3 text-[#facc15]" />
              ) : (
                <Wifi className="w-3 h-3 text-[#4ade80]" />
              )}
              <span className="text-[10px] text-white/70">{queueLabel}</span>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full">
            <span className="text-[13px] font-medium text-white">{shotIndex + 1} / {shotInstructions.length}</span>
          </div>
        </div>
      </div>

      {/* Instruction Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={shotIndex}
          initial={{ opacity: 0, y: -10, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -10, x: -20 }}
          transition={{ duration: 0.2 }}
          className="absolute top-20 left-4 right-4 z-40"
        >
          <div className="bg-[rgba(0,0,0,0.5)] backdrop-blur-lg border border-[rgba(232,78,250,0.10)] rounded-[16px] px-5 py-4 text-center">
            <p className="text-[16px] font-semibold text-white">{instruction.text}</p>
            <p className="text-[12px] text-[#a08fb0] mt-1">{positionLabel} · {instruction.type}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {orientationPermission === 'required' && (
        <button
          onClick={handleEnableLevel}
          className="absolute top-[154px] left-1/2 -translate-x-1/2 z-40 h-9 px-4 rounded-full bg-black/50 backdrop-blur-sm border border-[rgba(232,78,250,0.10)] text-[12px] font-medium text-white"
        >
          Увімкнути рівень
        </button>
      )}

      {orientationPermission === 'denied' && (
        <div className="absolute top-[154px] left-4 right-4 z-40 rounded-[12px] bg-black/50 backdrop-blur-sm border border-[rgba(232,78,250,0.10)] px-4 py-2 text-center text-[12px] text-[#facc15]">
          Рівень недоступний без дозволу на рух
        </div>
      )}

      {orientationPermission === 'granted' && (
        <div className="absolute left-10 right-10 top-1/2 z-40 pointer-events-none">
          <div className="relative h-10">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/25" />
            <div
              className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#d100d9] shadow-[0_0_12px_rgba(209,0,217,0.6)] transition-transform"
              style={{ transform: `translateY(${levelOffset}px) rotate(${tilt.gamma}deg)` }}
            />
          </div>
        </div>
      )}

      {/* Ghost Overlay */}
      <div className="absolute inset-0 z-[35] pointer-events-none flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-[70vw] h-[70vw] max-w-[320px] max-h-[320px] opacity-40">
          {instruction.type === 'wide' || instruction.type === 'wide_full' ? (
            <>
              <rect x="10" y="20" width="80" height="60" fill="none" stroke="rgba(209,0,217,0.5)" strokeWidth="0.5" strokeDasharray="3,3" rx="2" />
              <circle cx="12" cy="22" r="3" fill="none" stroke="rgba(209,0,217,0.6)" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
            </>
          ) : instruction.type === 'doorway' ? (
            <>
              <rect x="35" y="10" width="30" height="55" fill="none" stroke="rgba(209,0,217,0.5)" strokeWidth="0.5" strokeDasharray="3,3" rx="1" />
              <line x1="50" y1="10" x2="50" y2="65" stroke="rgba(209,0,217,0.4)" strokeWidth="0.3" strokeDasharray="2,2" />
            </>
          ) : instruction.type === 'window' ? (
            <>
              <rect x="25" y="25" width="50" height="35" fill="none" stroke="rgba(209,0,217,0.5)" strokeWidth="0.5" strokeDasharray="3,3" rx="1" />
              <line x1="25" y1="42" x2="75" y2="42" stroke="rgba(209,0,217,0.4)" strokeWidth="0.3" />
              <line x1="50" y1="25" x2="50" y2="60" stroke="rgba(209,0,217,0.4)" strokeWidth="0.3" />
            </>
          ) : instruction.type === 'detail' ? (
            <>
              <rect x="30" y="30" width="40" height="40" fill="none" stroke="rgba(209,0,217,0.5)" strokeWidth="0.5" strokeDasharray="3,3" rx="2" />
              <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(209,0,217,0.6)" strokeWidth="0.5" />
              <line x1="42" y1="50" x2="58" y2="50" stroke="rgba(209,0,217,0.5)" strokeWidth="0.5" />
              <line x1="50" y1="42" x2="50" y2="58" stroke="rgba(209,0,217,0.5)" strokeWidth="0.5" />
            </>
          ) : (
            <>
              <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
              <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
            </>
          )}
        </svg>
      </div>

      {/* Rule of thirds grid */}
      <div className="absolute inset-0 z-[36] pointer-events-none">
        <div className="w-full h-full relative">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/[0.06]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/[0.06]" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/[0.06]" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/[0.06]" />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent pt-16 pb-8 px-6">
        <div className="flex items-center justify-between">
          {/* Gallery Thumbnail */}
          <button className="w-12 h-12 rounded-[12px] bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-hidden border border-white/[0.1]">
            {capturedPhotos.length > 0 ? (
              <img src={capturedPhotos[capturedPhotos.length - 1].dataUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-[#a08fb0]" />
            )}
          </button>

          {/* Shutter Button */}
          <button
            onClick={capturePhoto}
            className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="absolute inset-0 rounded-full border-4 border-[#d100d9]" />
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>

          {/* Shot Dots */}
          <div className="flex gap-1.5">
            {shotInstructions.map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i < shotIndex ? 'bg-[#d100d9]' : i === shotIndex ? 'bg-[#d100d9] animate-pulse' : 'bg-[#555]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Next Room Button (when all shots done) */}
        {capturedPhotos.length >= shotInstructions.length && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNextRoom}
            disabled={isSavingRoom}
            className="mt-4 w-full h-12 bg-[#d100d9] text-[#0a070d] font-semibold rounded-[12px] flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSavingRoom ? 'Збереження...' : currentRoomIndex < activeRooms.length - 1 ? 'Наступна кімната' : 'Завершити зйомку'}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Photo Review Overlay */}
      <AnimatePresence>
        {showReview && lastCapture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[55] bg-black/70 flex flex-col"
          >
            {/* Captured Photo */}
            <div className="flex-1 relative">
              <img
                src={lastCapture.dataUrl}
                alt="Captured"
                className={`w-full h-full object-contain ${
                  lastCapture.status === 'accepted'
                    ? 'border-4 border-[#4ade80]'
                    : lastCapture.status === 'warning'
                    ? 'border-4 border-[#facc15]'
                    : 'border-4 border-[#f87171]'
                }`}
              />
              
              {/* Quality Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`absolute top-4 right-4 w-16 h-16 rounded-full flex flex-col items-center justify-center ${
                  lastCapture.qualityScore >= 70
                    ? 'bg-[#4ade80]'
                    : lastCapture.qualityScore >= 40
                    ? 'bg-[#facc15]'
                    : 'bg-[#f87171]'
                }`}
              >
                <span className="text-[18px] font-bold text-[#0a070d]">{lastCapture.qualityScore}</span>
                <span className="text-[9px] font-medium text-[#0a070d]">оцінка</span>
              </motion.div>
            </div>

            {/* Quality Feedback */}
            <div className="bg-[#14101a] rounded-t-[24px] p-6">
              <div className="w-10 h-1 rounded-full bg-[#333] mx-auto mb-4" />
              
              {lastCapture.status === 'accepted' ? (
                <div className="flex items-center gap-3 text-[#4ade80]">
                  <Check className="w-6 h-6" />
                  <p className="text-[16px] font-semibold">Чудова якість!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#facc15]">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-[14px] font-medium">
                      {lastCapture.issues.map((issue) => qualityMessages[issue]).join(', ')}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleRetake}
                      className="flex-1 h-11 bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] rounded-[12px] text-[14px] font-medium"
                    >
                      Перезняти
                    </button>
                    <button
                      onClick={handleAcceptAnyway}
                      className="flex-1 h-11 bg-[#d100d9] text-[#0a070d] rounded-[12px] text-[14px] font-semibold"
                    >
                      Прийняти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}