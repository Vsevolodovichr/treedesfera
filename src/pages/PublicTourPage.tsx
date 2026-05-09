import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Phone, Mail, ChevronRight, Home, Ruler, BedDouble } from 'lucide-react';

// Demo data for public tour
const demoTourData = {
  property: {
    address: 'вул. Хрещатик, 15, кв. 42',
    price: 145000,
    currency: '$',
    rooms: 3,
    area: 85,
    floor: 5,
    totalFloors: 9,
    description: 'Сучасна 3-кімнатна квартира в центрі міста з панорамним видом на центральну вулицю. Повний ремонт, нова техніка.',
    agent: {
      name: 'Олександр Петренко',
      phone: '+380 67 123 4567',
      email: 'agent@xatosfera.ua',
    },
  },
  rooms: [
    { id: '1', name: 'Кухня', type: 'kitchen', photos: ['/room-kitchen.jpg'], area: 12 },
    { id: '2', name: 'Вітальня', type: 'living', photos: ['/room-living.jpg'], area: 28 },
    { id: '3', name: 'Спальня', type: 'bedroom', photos: ['/room-bedroom.jpg'], area: 18 },
    { id: '4', name: 'Ванна', type: 'bathroom', photos: ['/room-bathroom.jpg'], area: 8 },
  ],
  floorPlan: '/floor-plan-demo.jpg',
  hotspots: [
    { roomId: '1', x: 58, y: 25, label: 'Кухня' },
    { roomId: '2', x: 65, y: 55, label: 'Вітальня' },
    { roomId: '3', x: 22, y: 35, label: 'Спальня' },
    { roomId: '4', x: 42, y: 22, label: 'Ванна' },
  ],
};

export default function PublicTourPage() {
  useParams();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [showPhoto, setShowPhoto] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const allPhotos = demoTourData.rooms.flatMap((r) => r.photos);
  const selectedRoom = demoTourData.rooms.find((r) => r.id === selectedRoomId);

  const openPhoto = (url: string) => {
    const idx = allPhotos.indexOf(url);
    setLightboxIdx(idx >= 0 ? idx : 0);
    setShowPhoto(url);
  };

  const nextPhoto = () => {
    const next = (lightboxIdx + 1) % allPhotos.length;
    setLightboxIdx(next);
    setShowPhoto(allPhotos[next]);
  };

  const prevPhoto = () => {
    const prev = (lightboxIdx - 1 + allPhotos.length) % allPhotos.length;
    setLightboxIdx(prev);
    setShowPhoto(allPhotos[prev]);
  };

  // Close photo on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPhoto(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans">
      {/* Hero */}
      <div className="relative h-[280px] overflow-hidden">
        <img
          src={allPhotos[0]}
          alt="Property"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
        
        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        {/* Info overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-[22px] font-bold text-white">{demoTourData.property.address}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[24px] font-bold text-[#d4af37]">
              {demoTourData.property.price.toLocaleString()} {demoTourData.property.currency}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[13px] text-[#ccc]">
            <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {demoTourData.property.rooms} кімн.</span>
            <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> {demoTourData.property.area} м²</span>
            <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> {demoTourData.property.floor}/{demoTourData.property.totalFloors} пов.</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 mt-6"
      >
        <p className="text-[14px] text-[#ccc] leading-relaxed">{demoTourData.property.description}</p>
      </motion.div>

      {/* Floor Plan */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mt-6"
      >
        <h2 className="text-[18px] font-semibold text-[#f5f5f5] mb-3">Планування</h2>
        <div className="relative bg-[#141414] border border-white/[0.08] rounded-[16px] overflow-hidden">
          <img
            src={demoTourData.floorPlan}
            alt="Floor Plan"
            className="w-full p-4"
          />
          
          {/* Hotspots */}
          {demoTourData.hotspots.map((hotspot) => {
            const isSelected = selectedRoomId === hotspot.roomId;
            return (
              <button
                key={hotspot.roomId}
                onClick={() => setSelectedRoomId(isSelected ? null : hotspot.roomId)}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                  isSelected
                    ? 'bg-[#d4af37] text-[#0a0a0a] scale-110'
                    : 'bg-[rgba(212,175,55,0.3)] text-[#d4af37] border border-[#d4af37]/40'
                }`}>
                  {hotspot.label.charAt(0)}
                </div>
                <span className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap px-1 rounded transition-all ${
                  isSelected ? 'bg-[#d4af37] text-[#0a0a0a] font-medium' : 'bg-black/60 text-white'
                }`}>
                  {hotspot.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Room Details */}
      {selectedRoom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 mt-4 bg-[#141414] border border-white/[0.08] rounded-[16px] p-4 mx-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#f5f5f5]">{selectedRoom.name}</h3>
              <p className="text-[13px] text-[#888]">{selectedRoom.area} м²</p>
            </div>
            <button
              onClick={() => selectedRoom.photos[0] && openPhoto(selectedRoom.photos[0])}
              className="px-4 h-9 bg-[#d4af37] text-[#0a0a0a] text-[13px] font-medium rounded-full"
            >
              Переглянути
            </button>
          </div>
        </motion.div>
      )}

      {/* Room Galleries */}
      <div className="px-4 mt-6">
        <h2 className="text-[18px] font-semibold text-[#f5f5f5] mb-4">Фото кімнат</h2>
        
        {demoTourData.rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-medium text-[#f5f5f5]">{room.name}</h3>
              <span className="text-[12px] text-[#888]">{room.area} м²</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
              {room.photos.map((photo, pi) => (
                <button
                  key={pi}
                  onClick={() => openPhoto(photo)}
                  className="snap-start flex-shrink-0 w-full max-w-[300px] h-[180px] rounded-[12px] overflow-hidden border border-white/[0.08] active:scale-[0.98] transition-transform"
                >
                  <img src={photo} alt={room.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Spacer for CTA */}
      <div className="h-24" />

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-40">
        <button
          onClick={() => setShowContact(true)}
          className="w-full h-[56px] bg-[#d4af37] text-[#0a0a0a] font-semibold text-[16px] rounded-[14px] flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Написати менеджеру
        </button>
      </div>

      {/* Contact Bottom Sheet */}
      <AnimatePresence>
        {showContact && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowContact(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-[#141414] rounded-t-[24px] p-6"
            >
              <div className="w-10 h-1 rounded-full bg-[#333] mx-auto mb-5" />
              <h3 className="text-[20px] font-semibold text-[#f5f5f5] mb-1">Зв'язатися з менеджером</h3>
              <p className="text-[14px] text-[#888] mb-5">{demoTourData.property.agent.name}</p>
              
              <div className="space-y-3">
                <a
                  href={`tel:${demoTourData.property.agent.phone}`}
                  className="w-full h-14 bg-[#1a1a1a] rounded-[14px] flex items-center px-5 gap-3 text-[#f5f5f5] hover:bg-[#222] transition-colors"
                >
                  <Phone className="w-5 h-5 text-[#d4af37]" />
                  <span className="text-[15px]">{demoTourData.property.agent.phone}</span>
                </a>
                <a
                  href={`mailto:${demoTourData.property.agent.email}`}
                  className="w-full h-14 bg-[#1a1a1a] rounded-[14px] flex items-center px-5 gap-3 text-[#f5f5f5] hover:bg-[#222] transition-colors"
                >
                  <Mail className="w-5 h-5 text-[#d4af37]" />
                  <span className="text-[15px]">{demoTourData.property.agent.email}</span>
                </a>
              </div>
              
              <button
                onClick={() => setShowContact(false)}
                className="w-full mt-4 h-12 text-[#888] text-[14px] font-medium"
              >
                Скасувати
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {showPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          >
            <button
              onClick={() => setShowPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={prevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center z-10"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            
            <motion.img
              key={showPhoto}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={showPhoto}
              alt=""
              className="max-w-[95%] max-h-[85%] object-contain rounded-[8px]"
            />
            
            <button
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center z-10"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            
            <p className="absolute bottom-8 text-[13px] text-[#888] z-10">
              {lightboxIdx + 1} / {allPhotos.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
