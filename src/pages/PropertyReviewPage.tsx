import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

export default function PropertyReviewPage() {
  const navigate = useNavigate();
  const { rooms, property } = useStore();
  const activeRooms = rooms.filter((r) => r.active);
  const completedRooms = activeRooms.filter((r) => r.status === 'completed');
  
  const overallScore = completedRooms.length > 0
    ? Math.round(completedRooms.reduce((s, r) => s + (r.qualityScore || 0), 0) / completedRooms.length)
    : 0;

  const isReady = overallScore >= 40;
  const missingCount = activeRooms.filter((r) => r.status !== 'completed').length;

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-[22px] font-semibold text-[#f5f5f5] mb-1">Огляд об'єкта</h2>
        <p className="text-[14px] text-[#888]">{property?.address || 'Адреса не вказана'}</p>
      </motion.div>

      {/* Overall Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 bg-[#141414] border border-white/[0.08] rounded-[16px] p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isReady ? 'bg-[rgba(212,175,55,0.15)]' : 'bg-[rgba(248,113,113,0.15)]'
              }`}>
                <span className={`text-[28px] font-bold ${
                  isReady ? 'text-[#d4af37]' : 'text-[#f87171]'
                }`}>{overallScore}</span>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-[#f5f5f5]">
                  {isReady ? 'Готовий до публікації' : 'Потрібні виправлення'}
                </p>
                <p className="text-[13px] text-[#888] mt-0.5">
                  {completedRooms.length} з {activeRooms.length} кімнат
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedRooms.length / activeRooms.length) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-[#d4af37] rounded-full"
          />
        </div>
      </motion.div>

      {/* Room Status Cards */}
      <div className="mt-6 space-y-3">
        <h3 className="text-[14px] font-semibold text-[#888] uppercase tracking-wider">Статус кімнат</h3>
        
        {activeRooms.map((room, index) => {
          const score = room.qualityScore || 0;
          const isCompleted = room.status === 'completed';
          const hasWarnings = room.photos.some((p) => p.status === 'warning');
          
          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              className="bg-[#141414] border border-white/[0.08] rounded-[12px] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? hasWarnings
                        ? 'bg-[rgba(250,204,21,0.15)]'
                        : 'bg-[rgba(74,222,128,0.15)]'
                      : 'bg-[#1a1a1a]'
                  }`}>
                    {isCompleted ? (
                      hasWarnings ? (
                        <AlertTriangle className="w-4 h-4 text-[#facc15]" />
                      ) : (
                        <Check className="w-4 h-4 text-[#4ade80]" />
                      )
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#555]" />
                    )}
                  </div>
                  <p className="text-[14px] font-medium text-[#f5f5f5]">{room.name}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Shot dots */}
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < room.photos.length
                            ? room.photos[i]?.status === 'accepted'
                              ? 'bg-[#4ade80]'
                              : room.photos[i]?.status === 'warning'
                              ? 'bg-[#facc15]'
                              : 'bg-[#f87171]'
                            : 'bg-[#333]'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {isCompleted && (
                    <span className={`text-[13px] font-semibold ${
                      score >= 70 ? 'text-[#4ade80]' : score >= 40 ? 'text-[#facc15]' : 'text-[#f87171]'
                    }`}>
                      {score}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Missing Items */}
      {missingCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-[#141414] border border-[rgba(248,113,113,0.15)] rounded-[12px] p-4"
        >
          <h3 className="text-[14px] font-semibold text-[#f87171] mb-2">Необхідно виправити</h3>
          <div className="space-y-1.5">
            {activeRooms
              .filter((r) => r.status !== 'completed')
              .map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-[12px] text-[#888]">
                  <AlertCircle className="w-3.5 h-3.5 text-[#f87171] shrink-0" />
                  <span>Кімната "{r.name}" не знята</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent max-w-[480px] mx-auto space-y-3">
        <button
          onClick={() => navigate('/preview')}
          className="w-full h-[56px] bg-[#d4af37] hover:bg-[#e8c547] active:bg-[#b8962e] text-[#0a0a0a] font-semibold text-[15px] rounded-[12px] transition-all flex items-center justify-center gap-2"
        >
          Переглянути результат
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isReady && (
          <button
            onClick={() => navigate('/camera')}
            className="w-full h-12 border border-[rgba(212,175,55,0.3)] text-[#d4af37] font-medium rounded-[12px] text-[14px]"
          >
            Повернутися до зйомки
          </button>
        )}
      </div>
    </div>
  );
}
