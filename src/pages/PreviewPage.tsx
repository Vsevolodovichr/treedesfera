import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

export default function PreviewPage() {
  const navigate = useNavigate();
  const { property, rooms, floorPlan } = useStore();
  const activeRooms = rooms.filter((r) => r.active);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allPhotos = activeRooms.flatMap((r) => r.photos);
  const openLightbox = (url: string) => {
    const idx = allPhotos.findIndex((p) => p.url === url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setShowFullImage(url);
  };

  const nextPhoto = () => {
    const next = (lightboxIndex + 1) % allPhotos.length;
    setLightboxIndex(next);
    setShowFullImage(allPhotos[next]?.url || null);
  };

  const prevPhoto = () => {
    const prev = (lightboxIndex - 1 + allPhotos.length) % allPhotos.length;
    setLightboxIndex(prev);
    setShowFullImage(allPhotos[prev]?.url || null);
  };

  return (
    <div className="min-h-screen pb-28">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-[18px] font-semibold text-white">{property?.shortName || 'Об\'єкт'}</h2>
          <div className="flex items-center gap-1 mt-1 text-[13px] text-[#ccc]">
            <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>{property?.address || 'Адреса'}</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[20px] font-bold text-[#d4af37]">
              {property?.price ? `${property.price.toLocaleString()} $` : 'Ціна не вказана'}
            </span>
            <span className="text-[13px] text-[#888]">
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
          <h3 className="text-[16px] font-semibold text-[#f5f5f5] mb-3">Планування</h3>
          <div className="relative bg-[#141414] border border-white/[0.08] rounded-[16px] overflow-hidden aspect-square">
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
                      ? 'bg-[#d4af37] text-[#0a0a0a] scale-110 animate-pulse-gold'
                      : 'bg-[rgba(212,175,55,0.3)] text-[#d4af37] border border-[#d4af37]/40'
                  }`}>
                    {hotspot.label.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded transition-all ${
                    isSelected ? 'bg-[#d4af37] text-[#0a0a0a]' : 'bg-black/60 text-white'
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
        <h3 className="text-[16px] font-semibold text-[#f5f5f5] mb-3">Кімнати</h3>
        
        {activeRooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="mb-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-medium text-[#f5f5f5]">{room.name}</p>
              <span className="text-[12px] text-[#888]">{room.photos.length} фото</span>
            </div>
            
            {room.photos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
                {room.photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => openLightbox(photo.url)}
                    className="snap-start flex-shrink-0 w-28 h-20 rounded-[10px] overflow-hidden border border-white/[0.08] active:scale-95 transition-transform"
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full h-16 bg-[#141414] rounded-[10px] flex items-center justify-center text-[12px] text-[#555]">
                Фото відсутні
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent max-w-[480px] mx-auto">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/camera')}
            className="flex-1 h-[52px] border border-white/[0.15] text-[#888] font-medium rounded-[12px] text-[14px] hover:text-[#f5f5f5] transition-colors"
          >
            До зйомки
          </button>
          <button
            onClick={() => navigate('/publish')}
            className="flex-[2] h-[52px] bg-[#d4af37] hover:bg-[#e8c547] text-[#0a0a0a] font-semibold rounded-[12px] text-[15px] transition-all"
          >
            Опублікувати тур
          </button>
        </div>
      </div>

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
              onClick={() => setShowFullImage(null)}
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
            
            <motion.img
              key={showFullImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={showFullImage}
              alt=""
              className="max-w-[90%] max-h-[80%] object-contain rounded-[8px]"
            />
            
            <button
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            
            <p className="absolute bottom-8 text-[13px] text-[#888]">
              {lightboxIndex + 1} / {allPhotos.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
