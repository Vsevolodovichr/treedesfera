import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Upload, Camera, Layers, RotateCcw, Check, X, GripVertical } from 'lucide-react';
import { useStore, roomTypeLabels } from '../store';
import { uploadFloorPlan } from '../lib/api';

interface PlacedHotspot {
  id: string;
  roomId: string;
  x: number;
  y: number;
  label: string;
}

function getUploadedFloorPlanUrl(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const directUrl = record.floor_plan_url || record.floorPlanUrl || record.image_url || record.url;
  if (typeof directUrl === 'string') return directUrl;
  const key = record.floor_plan_key;
  return typeof key === 'string' && (key.startsWith('/') || key.startsWith('http')) ? key : null;
}

export default function PlanSetupPage() {
  const navigate = useNavigate();
  const { rooms, property, floorPlan, setFloorPlan } = useStore();
  const [mode, setMode] = useState<'select' | 'upload' | 'place'>(floorPlan?.imageUrl ? 'place' : 'select');
  const [planImage, setPlanImage] = useState<string | null>(floorPlan?.imageUrl || null);
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [planType, setPlanType] = useState<'image' | 'pdf'>('image');
  const [hotspots, setHotspots] = useState<PlacedHotspot[]>(floorPlan?.hotspots || []);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextHotspotId = useRef(0);

  const activeRooms = rooms.filter((r) => r.active);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPlanFile(file);
      setPlanImage(url);
      setPlanType(file.type === 'application/pdf' ? 'pdf' : 'image');
      setUploadError(null);
      setMode('place');
    }
  };

  const handlePlanTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingId) return;
    if (!planRef.current) return;
    const rect = planRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPoint({ x, y });
    setShowRoomPicker(true);
  };

  const handleRoomSelect = (room: typeof activeRooms[0]) => {
    if (!pendingPoint) return;
    const existing = hotspots.find((h) => h.roomId === room.id);
    if (existing) {
      setHotspots(hotspots.map((h) => (h.id === existing.id ? { ...h, x: pendingPoint.x, y: pendingPoint.y } : h)));
    } else {
      nextHotspotId.current += 1;
      setHotspots([
        ...hotspots,
        {
          id: `hs_${room.id}_${nextHotspotId.current}`,
          roomId: room.id,
          x: pendingPoint.x,
          y: pendingPoint.y,
          label: room.name,
        },
      ]);
    }
    setPendingPoint(null);
    setShowRoomPicker(false);
  };

  const handleRemoveHotspot = (id: string) => {
    setHotspots(hotspots.filter((h) => h.id !== id));
  };

  const handleConfirm = async () => {
    if (planImage) {
      setIsSaving(true);
      let imageUrl = planImage;
      if (planFile && property?.id) {
        try {
          const uploaded = await uploadFloorPlan(property.id, planFile);
          imageUrl = getUploadedFloorPlanUrl(uploaded) || imageUrl;
        } catch {
          setUploadError('Не вдалося завантажити план');
          setIsSaving(false);
          return;
        }
      }
      setFloorPlan({
        imageUrl,
        hotspots: hotspots.map((h) => ({ id: h.id, roomId: h.roomId, x: h.x, y: h.y, label: h.label })),
      });
    }
    setIsSaving(false);
    navigate('/rooms');
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!planRef.current || !draggingId) return;
      const rect = planRef.current.getBoundingClientRect();
      const x = ((info.point.x - rect.left) / rect.width) * 100;
      const y = ((info.point.y - rect.top) / rect.height) * 100;
      setHotspots((prev) =>
        prev.map((h) => (h.id === draggingId ? { ...h, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : h))
      );
      setDraggingId(null);
    },
    [draggingId]
  );

  // Mode Selection
  if (mode === 'select') {
    return (
      <div className="min-h-dvh px-4 pt-5 pb-0">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-[22px] font-semibold text-[#f5f0fa] mb-1">План приміщення</h2>
          <p className="text-[14px] text-[#a08fb0] mb-6">Оберіть спосіб додавання плану</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'upload', icon: Upload, title: 'Завантажити', desc: 'Вибрати зображення плану', primary: true },
            { id: 'photo', icon: Camera, title: 'Сфотографувати', desc: 'Зняти друкований план', primary: false },
            { id: 'manual', icon: GripVertical, title: 'Намалювати', desc: 'Схематичний план вручну', primary: false, disabled: true, badge: 'P2' },
            { id: 'combined', icon: Layers, title: 'Комбінований', desc: 'Завантажити + розмістити точки', primary: true, badge: 'MVP' },
          ].map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileTap={!card.disabled ? { scale: 0.97 } : {}}
                onClick={() => {
                  if (card.disabled) return;
                  if (card.id === 'upload' || card.id === 'combined') {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={card.disabled}
                className={`relative flex flex-col items-center text-center p-5 rounded-[16px] border transition-all ${
                  card.primary && !card.disabled
                    ? 'bg-[rgba(209,0,217,0.12)] border-[rgba(209,0,217,0.2)]'
                    : card.disabled
                    ? 'bg-[#14101a] border-[rgba(232,78,250,0.10)] opacity-40'
                    : 'bg-[#14101a] border-[rgba(232,78,250,0.10)]'
                } ${card.disabled ? '' : 'active:scale-[0.97]'}`}
              >
                {card.badge && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#d100d9] text-[#0a070d] text-[10px] font-bold rounded-full">
                    {card.badge}
                  </span>
                )}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    card.primary ? 'bg-[rgba(209,0,217,0.2)]' : 'bg-[#1a1422]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${card.primary ? 'text-[#d100d9]' : 'text-[#a08fb0]'}`} />
                </div>
                <h3 className="text-[14px] font-semibold text-[#f5f0fa]">{card.title}</h3>
                <p className="text-[12px] text-[#a08fb0] mt-1">{card.desc}</p>
              </motion.button>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-[#0a070d] via-[#0a070d]/90 to-transparent pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              setFloorPlan(null);
              navigate('/rooms');
            }}
            className="w-full h-[56px] border border-[rgba(209,0,217,0.3)] text-[#d100d9] font-semibold text-[15px] rounded-[12px] transition-all hover:bg-[rgba(209,0,217,0.08)]"
          >
            Пропустити цей крок
          </button>
        </div>
      </div>
    );
  }

  // Place hotspots mode
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Plan Area */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-[#a08fb0] mb-3 text-center">
          Торкніться плану, щоб розмістити точку кімнати
        </motion.p>

        <div
          ref={planRef}
          onClick={handlePlanTap}
          className="relative w-full aspect-square bg-[#14101a] rounded-[16px] overflow-hidden border border-[rgba(232,78,250,0.10)] cursor-crosshair"
        >
          {planImage && planType === 'pdf' && (
            <object data={planImage} type="application/pdf" className="w-full h-full bg-white">
              <div className="flex h-full items-center justify-center text-[12px] text-[#a08fb0]">PDF-план завантажено</div>
            </object>
          )}

          {planImage && planType === 'image' && (
            <img src={planImage} alt="Floor Plan" className="w-full h-full object-contain" draggable={false} />
          )}

          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '20% 20%'
            }} />
          </div>

          {/* Hotspots */}
          {hotspots.map((h) => (
            <motion.div
              key={h.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              drag
              dragMomentum={false}
              onDragStart={() => handleDragStart(h.id)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveHotspot(h.id);
              }}
              className="absolute z-10 cursor-pointer"
              style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative animate-pulse-gold">
                <div className="w-10 h-10 rounded-full bg-[rgba(209,0,217,0.25)] border-2 border-[#d100d9] flex items-center justify-center backdrop-blur-sm">
                  <span className="text-[11px] font-bold text-[#d100d9]">{h.label.charAt(0)}</span>
                </div>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white font-medium whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded">
                  {h.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Hotspot Legend */}
        {hotspots.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-wrap gap-2">
            {hotspots.map((h) => (
              <span key={h.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(209,0,217,0.1)] border border-[rgba(209,0,217,0.2)] rounded-full text-[12px] text-[#d100d9]">
                {h.label}
                <button onClick={() => handleRemoveHotspot(h.id)} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </motion.div>
        )}
      </div>

      {/* Room Picker Bottom Sheet */}
      <AnimatePresence>
        {showRoomPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowRoomPicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#14101a] rounded-t-[24px] p-6 max-w-[480px] mx-auto"
            >
              <div className="w-10 h-1 rounded-full bg-[#333] mx-auto mb-5" />
              <h3 className="text-[18px] font-semibold text-[#f5f0fa] mb-4">Оберіть кімнату</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                {activeRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#1a1422] hover:bg-[#222] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[rgba(209,0,217,0.15)] flex items-center justify-center">
                      <span className="text-[#d100d9] text-sm font-bold">{room.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#f5f0fa]">{room.name}</p>
                      <p className="text-[12px] text-[#a08fb0]">{roomTypeLabels[room.type]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Actions */}
      <div className="p-4 bg-gradient-to-t from-[#0a070d] via-[#0a070d] to-transparent">
        <div className="flex gap-3">
          <button
            onClick={() => {
              setMode('select');
              setPlanImage(null);
              setPlanFile(null);
              setPlanType('image');
              setHotspots([]);
            }}
            className="flex-1 h-[52px] border border-white/[0.15] text-[#a08fb0] font-medium rounded-[12px] flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Скинути
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving}
            className="flex-[2] h-[52px] bg-[#d100d9] text-[#0a070d] font-semibold rounded-[12px] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Збереження...' : 'Підтвердити план'}
          </button>
        </div>
        {uploadError && <p className="mt-2 text-center text-[12px] text-[#f87171]">{uploadError}</p>}
      </div>
    </div>
  );
}
