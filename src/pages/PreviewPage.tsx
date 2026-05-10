import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { getDepth } from '../lib/depth/storage';
import { requestOrientationPermission } from '../lib/depth/orientation';
import PanoramaViewer from '../components/PanoramaViewer';
import { BottomActionBar } from '../components/layout/BottomActionBar';

const DepthViewer = lazy(() => import('../components/DepthViewer'));

export default function PreviewPage() {
  const navigate = useNavigate();
  const { property, rooms, floorPlan } = useStore();
  const activeRooms = rooms.filter((r) => r.active);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxDepth, setLightboxDepth] = useState<{ photoId: string; url: string } | null>(null);
  const [orientationEnabled, setOrientationEnabled] = useState(false);
  const isPanoEnabled = import.meta.env.VITE_PANO_ENABLED === 'true';

  const allPhotos = activeRooms.flatMap((r) => r.photos);
  const activePhoto = allPhotos[lightboxIndex] || null;
  const lightboxDepthUrl = showFullImage && activePhoto && lightboxDepth?.photoId === activePhoto.id ? lightboxDepth.url : null;

  useEffect(() => {
    let cancelled = false;
    let nextDepthUrl: string | null = null;

    if (!showFullImage || !activePhoto || activePhoto.depthStatus !== 'ready' || import.meta.env.VITE_DEPTH_ENABLED === 'false') {
      return;
    }

    void getDepth(activePhoto.id).then((depth) => {
      if (cancelled) {
        if (depth) URL.revokeObjectURL(depth.url);
        return;
      }
      nextDepthUrl = depth?.url ?? null;
      setLightboxDepth(nextDepthUrl ? { photoId: activePhoto.id, url: nextDepthUrl } : null);
    });

    return () => {
      cancelled = true;
      if (nextDepthUrl) URL.revokeObjectURL(nextDepthUrl);
    };
  }, [activePhoto, showFullImage]);

  const openLightbox = (url: string) => {
    const idx = allPhotos.findIndex((p) => p.url === url);
    setLightboxDepth(null);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setShowFullImage(url);
  };

  const nextPhoto = () => {
    const next = (lightboxIndex + 1) % allPhotos.length;
    setLightboxDepth(null);
    setLightboxIndex(next);
    setShowFullImage(allPhotos[next]?.url || null);
  };

  const prevPhoto = () => {
    const prev = (lightboxIndex - 1 + allPhotos.length) % allPhotos.length;
    setLightboxDepth(null);
    setLightboxIndex(prev);
    setShowFullImage(allPhotos[prev]?.url || null);
  };

  const handleEnable3d = async () => {
    setOrientationEnabled(await requestOrientationPermission());
  };

  return (
    <div className="min-h-full pb-0">
      {/* Property Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[220px] overflow-hidden"
      >
        <img
          src={allPhotos[0]?.url || '/room-living.jpg'}
          alt="Property"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a070d] via-[#0a070d]/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-[18px] font-semibold text-white">{property?.shortName || 'Об\'єкт'}</h2>
          <div className="flex items-center gap-1 mt-1 text-[13px] text-[#ccc]">
            <MapPin className="w-3.5 h-3.5 text-[#d100d9]" />
            <span>{property?.address || 'Адреса'}</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[20px] font-bold text-[#d100d9]">
              {property?.price ? `${property.price.toLocaleString()} $` : 'Ціна не вказана'}
            </span>
            <span className="text-[13px] text-[#a08fb0]">
              {property?.rooms} кімн. · {property?.area} м²
            </span>
          </div>
        </div>
      </motion.div>

      {/* Floor Plan */}
      {floorPlan?.imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="px-4 mt-6"
        >
          <h3 className="text-[16px] font-semibold text-[#f5f0fa] mb-3">Планування</h3>
          <div className="relative bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[16px] overflow-hidden aspect-square">
            <img
              src={floorPlan.imageUrl}
              alt="Floor Plan"
              className="w-full h-full object-contain p-4"
            />
            
            {/* Hotspots */}
            {floorPlan.hotspots.map((hotspot) => {
              const isSelected = selectedRoomId === hotspot.roomId;
              return (
                <button
                  key={hotspot.id}
                  onClick={() => setSelectedRoomId(isSelected ? null : hotspot.roomId)}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isSelected
                      ? 'bg-[#d100d9] text-[#0a070d] scale-110 animate-pulse-gold'
                      : 'bg-[rgba(209,0,217,0.3)] text-[#d100d9] border border-[#d100d9]/40'
                  }`}>
                    {hotspot.label.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded transition-all ${
                    isSelected ? 'bg-[#d100d9] text-[#0a070d]' : 'bg-black/60 text-white'
                  }`}>
                    {hotspot.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Room Gallery */}
      <div className="px-4 mt-6">
        <h3 className="text-[16px] font-semibold text-[#f5f0fa] mb-3">Кімнати</h3>
        
        {activeRooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="mb-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-medium text-[#f5f0fa]">{room.name}</p>
              <span className="text-[12px] text-[#a08fb0]">{room.photos.length} фото</span>
            </div>

            {isPanoEnabled && room.panorama?.status === 'ready' && room.panorama.equirectangularUrl && (
              <div className="mb-3 h-[260px] overflow-hidden rounded-[12px] border border-[rgba(232,78,250,0.10)] bg-black">
                <PanoramaViewer
                  panoramaUrl={room.panorama.equirectangularUrl}
                  hfov={room.panorama.hfov}
                  className="h-full"
                />
              </div>
            )}
            
            {room.photos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
                {room.photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => openLightbox(photo.url)}
                    className="snap-start flex-shrink-0 w-28 h-20 rounded-[10px] overflow-hidden border border-[rgba(232,78,250,0.10)] active:scale-95 transition-transform"
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full h-16 bg-[#14101a] rounded-[10px] flex items-center justify-center text-[12px] text-[#5a4d68]">
                Фото відсутні
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Bottom Buttons */}
      <BottomActionBar>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/camera')}
            className="flex-1 h-[52px] border border-white/[0.15] text-[#a08fb0] font-medium rounded-[12px] text-[14px] hover:text-[#f5f0fa] transition-colors"
          >
            До зйомки
          </button>
          <button
            onClick={() => navigate('/publish')}
            className="flex-[2] h-[52px] bg-[#d100d9] hover:bg-[#e84efa] text-[#0a070d] font-semibold rounded-[12px] text-[15px] transition-all"
          >
            Опублікувати тур
          </button>
        </div>
      </BottomActionBar>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {showFullImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          >
            <button
              onClick={() => {
                setLightboxDepth(null);
                setShowFullImage(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={prevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            
            {lightboxDepthUrl ? (
              <>
                {!orientationEnabled && (
                  <button
                    type="button"
                    onClick={handleEnable3d}
                    className="absolute top-16 left-1/2 -translate-x-1/2 h-10 rounded-[10px] bg-[#d100d9] px-4 text-[13px] font-semibold text-[#0a070d]"
                  >
                    Увімкнути 3D
                  </button>
                )}
                <motion.div
                  key={`${showFullImage}-depth`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-[90vw] max-w-[900px] max-h-[80vh] aspect-[4/3] rounded-[8px]"
                >
                  <Suspense fallback={null}>
                    <DepthViewer photoUrl={showFullImage} depthUrl={lightboxDepthUrl} className="h-full w-full rounded-[8px]" />
                  </Suspense>
                </motion.div>
              </>
            ) : (
              <motion.img
                key={showFullImage}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={showFullImage}
                alt=""
                className="max-w-[90%] max-h-[80%] object-contain rounded-[8px]"
              />
            )}
            
            <button
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            
            <p className="absolute bottom-8 text-[13px] text-[#a08fb0]">
              {lightboxIndex + 1} / {allPhotos.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
