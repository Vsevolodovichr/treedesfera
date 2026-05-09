import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Camera, Check, ChevronRight } from 'lucide-react';
import { useStore, qualityMessages } from '../store';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { rooms } = useStore();
  const activeRooms = rooms.filter((r) => r.active);
  const completedRooms = activeRooms.filter((r) => r.status === 'completed');
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const overallScore = completedRooms.length > 0
    ? Math.round(completedRooms.reduce((s, r) => s + (r.qualityScore || 0), 0) / completedRooms.length)
    : 0;

  const handleContinue = () => {
    navigate('/property-review');
  };

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-[22px] font-semibold text-[#f5f5f5]">
          Перевірка зйомки
        </h2>
        <p className="text-[14px] text-[#888] mt-1">
          {completedRooms.length} з {activeRooms.length} кімнат готові
        </p>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-6 flex flex-col items-center"
      >
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a1a" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none"
              stroke={overallScore >= 70 ? '#4ade80' : overallScore >= 40 ? '#facc15' : '#f87171'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(overallScore / 100) * 264} 264`}
              initial={{ strokeDashoffset: 264 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold text-[#f5f5f5]">{overallScore}</span>
          </div>
        </div>
        <p className="text-[13px] text-[#888] mt-2">Загальна оцінка</p>
      </motion.div>

      {/* Room Cards */}
      <div className="mt-8 space-y-3">
        {activeRooms.map((room, index) => {
          const roomScore = room.qualityScore || 0;
          const scoreColor = roomScore >= 70 ? 'text-[#4ade80]' : roomScore >= 40 ? 'text-[#facc15]' : roomScore > 0 ? 'text-[#f87171]' : 'text-[#555]';
          const bgColor = room.status === 'completed' ? 'bg-[#141414]' : room.status === 'capturing' ? 'bg-[#141414]' : 'bg-[#141414]/50';
          
          return (
            <motion.button
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
              className={`w-full text-left ${bgColor} border border-white/[0.08] rounded-[16px] p-4 transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    room.status === 'completed' ? 'bg-[rgba(212,175,55,0.15)]' : 'bg-[#1a1a1a]'
                  }`}>
                    <span className="text-[#d4af37] text-sm font-bold">{room.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#f5f5f5]">{room.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[12px] font-medium ${scoreColor}`}>
                        {room.status === 'completed' ? `${roomScore}/100` : 'Не знято'}
                      </span>
                      <span className="text-[#555] text-[11px]">·</span>
                      <span className="text-[12px] text-[#888]">{room.photos.length} фото</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {room.status === 'completed' && (
                    <span className="w-6 h-6 rounded-full bg-[#4ade80]/15 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                    </span>
                  )}
                  <span className={`text-[12px] ${scoreColor} font-semibold`}>
                    {room.status === 'completed' ? 'Готово' : room.status === 'capturing' ? 'В процесі' : 'Очікує'}
                  </span>
                </div>
              </div>

              {/* Expanded Photo Grid */}
              {selectedRoomId === room.id && room.photos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-white/[0.08]"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {room.photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-[4/3] rounded-[8px] overflow-hidden">
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${
                          photo.qualityScore >= 70 ? 'bg-[#4ade80]' : photo.qualityScore >= 40 ? 'bg-[#facc15]' : 'bg-[#f87171]'
                        }`} />
                        <span className="absolute bottom-1 left-1 text-[9px] text-white bg-black/50 px-1 rounded">{photo.type}</span>
                      </div>
                    ))}
                    {/* Add more button */}
                    <button className="aspect-[4/3] rounded-[8px] border border-dashed border-[rgba(212,175,55,0.3)] flex items-center justify-center text-[#d4af37]">
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Issues */}
                  {room.photos.some((p) => p.issues.length > 0) && (
                    <div className="mt-3 space-y-1.5">
                      {room.photos
                        .flatMap((p) => p.issues)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .map((issue) => (
                          <div key={issue} className="flex items-start gap-2 text-[12px] text-[#facc15]">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{qualityMessages[issue] || issue}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent max-w-[480px] mx-auto">
        <button
          onClick={handleContinue}
          className="w-full h-[56px] bg-[#d4af37] hover:bg-[#e8c547] active:bg-[#b8962e] text-[#0a0a0a] font-semibold text-[15px] rounded-[12px] transition-all flex items-center justify-center gap-2"
        >
          Продовжити
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
