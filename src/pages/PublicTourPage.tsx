import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Phone, Mail, ChevronRight, Home, Ruler, BedDouble } from 'lucide-react';
import { postPublicTourView } from '../lib/api';
import { hasOrientationPermission, requestOrientationPermission } from '../lib/depth/orientation';
import type { VirtualTour } from '../types/api';
import PanoramaViewer from '../components/PanoramaViewer';

const DepthViewer = lazy(() => import('../components/DepthViewer'));
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const DEPTH_ENABLED = import.meta.env.VITE_DEPTH_ENABLED !== 'false';
const PANO_ENABLED = import.meta.env.VITE_PANO_ENABLED === 'true';

interface PublicPhoto {
  id: string;
  url: string;
  depthUrl: string | null;
}

interface PublicRoom {
  id: string;
  name: string;
  type: string;
  photos: PublicPhoto[];
  area?: number;
  hasPanorama: boolean;
  panoramaUrl?: string;
  hfov?: number;
  yawOffset?: number;
}

interface PublicTourData {
  property: {
    address: string;
    price: number;
    currency: string;
    rooms: number;
    area: number;
    floor?: number;
    totalFloors?: number;
    description: string;
    agent: {
      name: string;
      phone?: string;
      email?: string;
    };
  };
  rooms: PublicRoom[];
  floorPlan: string | null;
  hotspots: Array<{ roomId: string; x: number; y: number; label: string }>;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(record: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

function numberValue(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return fallback;
}

function booleanValue(record: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => record[key] === true);
}

function imageUrlFromRecord(record: Record<string, unknown>) {
  return stringValue(record, ['url', 'public_url', 'image_url', 'photo_url', 'src', 'thumbnail']);
}

function collectPhotos(room: Record<string, unknown>): PublicPhoto[] {
  const direct = stringValue(room, ['photo_url', 'image_url', 'url']);
  const photos: PublicPhoto[] = direct ? [{ id: direct, url: direct, depthUrl: null }] : [];
  const rawPhotos = room.photos || room.images || room.photo_urls;

  if (Array.isArray(rawPhotos)) {
    rawPhotos.forEach((item, index) => {
      if (typeof item === 'string' && item.trim()) {
        photos.push({ id: item, url: item, depthUrl: null });
        return;
      }
      const photo = asRecord(item);
      const url = imageUrlFromRecord(photo);
      if (url) {
        photos.push({
          id: stringValue(photo, ['id', 'photo_id'], `${index + 1}`),
          url,
          depthUrl: stringValue(photo, ['depthUrl', 'depth_url']) || null,
        });
      }
    });
  }

  return Array.from(new Map(photos.map((photo) => [photo.url, photo])).values());
}

function getFloorPlanUrl(tour: Record<string, unknown>) {
  const direct = stringValue(tour, ['floor_plan_url', 'floorPlanUrl', 'floor_plan', 'floorPlan']);
  if (direct) return direct;
  const key = stringValue(tour, ['floor_plan_key']);
  return key.startsWith('/') || key.startsWith('http') ? key : null;
}

function normalizePublicTour(tour: VirtualTour): PublicTourData {
  const tourRecord = asRecord(tour);
  const propertyRecord = asRecord(tourRecord.property);
  const agentRecord = asRecord(propertyRecord.agent || tourRecord.agent);
  const rawRooms = Array.isArray(tour.rooms) ? tour.rooms : [];
  const rooms = rawRooms.map((value, index) => {
    const room = asRecord(value);
    const photos = collectPhotos(room);
    const panoramaUrl = stringValue(room, ['panoramaUrl', 'panorama_url', 'panorama']);
    return {
      id: stringValue(room, ['id', 'room_id'], `${index + 1}`),
      name: stringValue(room, ['name', 'label'], `Кімната ${index + 1}`),
      type: stringValue(room, ['type'], 'room'),
      photos,
      area: numberValue(room, ['area'], 0) || undefined,
      hasPanorama: Boolean(panoramaUrl) || booleanValue(room, ['has_panorama']) || stringValue(room, ['photo_type']) === 'panorama',
      panoramaUrl: panoramaUrl || undefined,
      hfov: numberValue(room, ['hfov'], 0) || undefined,
      yawOffset: numberValue(room, ['yawOffset', 'yaw_offset'], 0) || undefined,
    };
  }).filter((room) => room.photos.length > 0 || (PANO_ENABLED && room.panoramaUrl));

  const hotspots = (Array.isArray(tour.hotspots) ? tour.hotspots : []).map((value) => {
    const hotspot = asRecord(value);
    return {
      roomId: stringValue(hotspot, ['roomId', 'room_id']),
      x: numberValue(hotspot, ['x']),
      y: numberValue(hotspot, ['y']),
      label: stringValue(hotspot, ['label', 'name'], 'Кімната'),
    };
  }).filter((hotspot) => hotspot.roomId && Number.isFinite(hotspot.x) && Number.isFinite(hotspot.y));

  return {
    property: {
      address: stringValue(propertyRecord, ['address'], stringValue(tourRecord, ['address'], 'Об\'єкт')),
      price: numberValue(propertyRecord, ['price'], numberValue(tourRecord, ['price'])),
      currency: stringValue(propertyRecord, ['currency'], '$'),
      rooms: numberValue(propertyRecord, ['rooms'], rooms.length),
      area: numberValue(propertyRecord, ['area']),
      floor: numberValue(propertyRecord, ['floor']) || undefined,
      totalFloors: numberValue(propertyRecord, ['total_floors', 'totalFloors']) || undefined,
      description: stringValue(propertyRecord, ['description'], stringValue(tourRecord, ['description'])),
      agent: {
        name: stringValue(agentRecord, ['name'], stringValue(tourRecord, ['manager_name'], 'Менеджер')),
        phone: stringValue(agentRecord, ['phone', 'mobile']) || undefined,
        email: stringValue(agentRecord, ['email']) || undefined,
      },
    },
    rooms,
    floorPlan: getFloorPlanUrl(tourRecord),
    hotspots,
  };
}

async function fetchPublicTour(slug: string): Promise<VirtualTour> {
  const response = await fetch(`${API_BASE_URL}/api/public/tours/${encodeURIComponent(slug)}`);
  if (!response.ok) throw new Error('tour_unavailable');
  return response.json() as Promise<VirtualTour>;
}

function shouldRequestOrientationPermission() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function PublicTourPage() {
  const { slug, id } = useParams();
  const tourSlug = slug || id || '';
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [showPhoto, setShowPhoto] = useState<PublicPhoto | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showDepthTooltip, setShowDepthTooltip] = useState(false);
  const [orientationEnabled, setOrientationEnabled] = useState(() => hasOrientationPermission());
  const analyticsRef = useRef<{ roomId: string | null; startedAt: number }>({ roomId: null, startedAt: 0 });
  const roomSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const tourQuery = useQuery({
    queryKey: ['public-tour', tourSlug],
    queryFn: () => fetchPublicTour(tourSlug),
    enabled: !!tourSlug,
    retry: false,
    select: normalizePublicTour,
  });

  const tourData = tourQuery.data ?? null;
  const activeSelectedRoomId =
    selectedRoomId && tourData?.rooms.some((room) => room.id === selectedRoomId)
      ? selectedRoomId
      : tourData?.rooms[0]?.id || null;

  useEffect(() => {
    if (!tourSlug) return;
    void postPublicTourView(tourSlug, {}).catch(() => undefined);
  }, [tourSlug]);

  useEffect(() => {
    const previous = analyticsRef.current;
    if (previous.roomId && previous.roomId !== activeSelectedRoomId) {
      void postPublicTourView(tourSlug, {
        room_id: previous.roomId,
        time_on_room_ms: Date.now() - previous.startedAt,
      }).catch(() => undefined);
    }
    analyticsRef.current = { roomId: activeSelectedRoomId, startedAt: Date.now() };
  }, [activeSelectedRoomId, tourSlug]);

  useEffect(() => {
    return () => {
      const current = analyticsRef.current;
      if (current.roomId) {
        void postPublicTourView(tourSlug, {
          room_id: current.roomId,
          time_on_room_ms: Date.now() - current.startedAt,
        }).catch(() => undefined);
      }
    };
  }, [tourSlug]);

  const allPhotos = useMemo(() => tourData?.rooms.flatMap((room) => room.photos) ?? [], [tourData]);
  const selectedRoom = tourData?.rooms.find((room) => room.id === activeSelectedRoomId);
  const hasAnyPanorama = PANO_ENABLED && Boolean(tourData?.rooms.some((room) => room.panoramaUrl));
  const coverUrl = allPhotos[0]?.url || (PANO_ENABLED ? tourData?.rooms.find((room) => room.panoramaUrl)?.panoramaUrl : null) || '/room-living.jpg';
  const firstPanoramaRoomId = PANO_ENABLED ? tourData?.rooms.find((room) => room.panoramaUrl)?.id || null : null;

  const selectLightboxPhoto = (photo: PublicPhoto | null, index: number) => {
    setShowPhoto(photo);
    setLightboxIdx(index);
    if (DEPTH_ENABLED && photo?.depthUrl && localStorage.getItem('depth_tooltip_shown') !== 'true') {
      setShowDepthTooltip(true);
      localStorage.setItem('depth_tooltip_shown', 'true');
    } else {
      setShowDepthTooltip(false);
    }
  };

  const openPhoto = (photo: PublicPhoto) => {
    const idx = allPhotos.findIndex((item) => item.url === photo.url);
    selectLightboxPhoto(photo, idx >= 0 ? idx : 0);
  };

  const enable3d = async () => {
    setOrientationEnabled(await requestOrientationPermission());
  };

  const nextPhoto = () => {
    if (allPhotos.length === 0) return;
    const next = (lightboxIdx + 1) % allPhotos.length;
    selectLightboxPhoto(allPhotos[next], next);
  };

  const prevPhoto = () => {
    if (allPhotos.length === 0) return;
    const prev = (lightboxIdx - 1 + allPhotos.length) % allPhotos.length;
    selectLightboxPhoto(allPhotos[prev], prev);
  };

  const openSelectedRoom = () => {
    if (PANO_ENABLED && selectedRoom?.panoramaUrl) {
      roomSectionRefs.current[selectedRoom.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!selectedRoom?.photos[0]) return;
    const idx = allPhotos.findIndex((item) => item.url === selectedRoom.photos[0].url);
    setLightboxIdx(idx >= 0 ? idx : 0);
    selectLightboxPhoto(selectedRoom.photos[0], idx >= 0 ? idx : 0);
  };

  const selectRoomHotspot = (roomId: string) => {
    setSelectedRoomId(roomId);
    requestAnimationFrame(() => {
      roomSectionRefs.current[roomId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPhoto(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (tourQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a070d] text-[#f5f0fa] flex items-center justify-center">
        <p className="text-[14px] text-[#a08fb0]">Завантаження туру...</p>
      </div>
    );
  }

  if (tourQuery.isError || !tourData || (allPhotos.length === 0 && !hasAnyPanorama)) {
    return (
      <div className="min-h-screen bg-[#0a070d] text-[#f5f0fa] flex items-center justify-center px-6 text-center">
        <p className="text-[14px] text-[#a08fb0]">Тур недоступний або ще не опублікований</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a070d] text-[#f5f0fa] font-sans">
      <div className="relative h-[280px] overflow-hidden">
        <img
          src={coverUrl}
          alt="Property"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a070d] via-[#0a070d]/30 to-transparent" />
        
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-[22px] font-bold text-white">{tourData.property.address}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[24px] font-bold text-[#d100d9]">
              {tourData.property.price.toLocaleString()} {tourData.property.currency}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[13px] text-[#ccc]">
            <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {tourData.property.rooms} кімн.</span>
            <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> {tourData.property.area} м²</span>
            {tourData.property.floor ? (
              <span className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5" /> {tourData.property.floor}{tourData.property.totalFloors ? `/${tourData.property.totalFloors}` : ''} пов.
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {tourData.property.description ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-6"
        >
          <p className="text-[14px] text-[#ccc] leading-relaxed">{tourData.property.description}</p>
        </motion.div>
      ) : null}

      {tourData.floorPlan ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 mt-6"
        >
          <h2 className="text-[18px] font-semibold text-[#f5f0fa] mb-3">Планування</h2>
          <div className="relative bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[16px] overflow-hidden">
            <img
              src={tourData.floorPlan}
              alt="Floor Plan"
              className="w-full p-4"
            />
            
            {tourData.hotspots.map((hotspot) => {
              const isSelected = activeSelectedRoomId === hotspot.roomId;
              return (
                <button
                  key={hotspot.roomId}
                  onClick={() => selectRoomHotspot(hotspot.roomId)}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    isSelected
                      ? 'bg-[#d100d9] text-[#0a070d] scale-110'
                      : 'bg-[rgba(209,0,217,0.3)] text-[#d100d9] border border-[#d100d9]/40'
                  }`}>
                    {hotspot.label.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap px-1 rounded transition-all ${
                    isSelected ? 'bg-[#d100d9] text-[#0a070d] font-medium' : 'bg-black/60 text-white'
                  }`}>
                    {hotspot.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      {selectedRoom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 mt-4 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[16px] p-4 mx-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#f5f0fa]">{selectedRoom.name}</h3>
              {selectedRoom.area ? <p className="text-[13px] text-[#a08fb0]">{selectedRoom.area} м²</p> : null}
            </div>
            <button
              onClick={openSelectedRoom}
              className="px-4 h-9 bg-[#d100d9] text-[#0a070d] text-[13px] font-medium rounded-full"
            >
              Переглянути
            </button>
          </div>
        </motion.div>
      )}

      <div className="px-4 mt-6">
        <h2 className="text-[18px] font-semibold text-[#f5f0fa] mb-4">Фото кімнат</h2>
        
        {tourData.rooms.map((room, index) => (
          <motion.div
            key={room.id}
            ref={(element) => {
              roomSectionRefs.current[room.id] = element;
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-medium text-[#f5f0fa]">{room.name}</h3>
              {room.area ? <span className="text-[12px] text-[#a08fb0]">{room.area} м²</span> : null}
            </div>
            {PANO_ENABLED && room.panoramaUrl ? (
              <div className="mb-3">
                {room.id === firstPanoramaRoomId && shouldRequestOrientationPermission() && !orientationEnabled ? (
                  <button
                    type="button"
                    onClick={enable3d}
                    className="mb-2 h-10 rounded-[10px] bg-[#d4af37] px-4 text-[13px] font-semibold text-[#0a070d]"
                  >
                    Увімкнути 3D-огляд
                  </button>
                ) : null}
                <div className="h-[60vh] min-h-[320px] overflow-hidden rounded-[12px] border border-[rgba(232,78,250,0.10)] bg-black">
                  <PanoramaViewer panoramaUrl={room.panoramaUrl} hfov={room.hfov} className="h-full" />
                </div>
              </div>
            ) : null}
            {room.photos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
                {room.photos.map((photo, photoIndex) => (
                  <button
                    key={`${room.id}-${photoIndex}`}
                    onClick={() => openPhoto(photo)}
                    className="snap-start flex-shrink-0 w-full max-w-[300px] h-[180px] rounded-[12px] overflow-hidden border border-[rgba(232,78,250,0.10)] active:scale-[0.98] transition-transform"
                  >
                    {DEPTH_ENABLED && photo.depthUrl ? (
                      <Suspense fallback={<img src={photo.url} alt={room.name} className="w-full h-full object-cover" />}>
                        <DepthViewer photoUrl={photo.url} depthUrl={photo.depthUrl} className="h-full w-full" />
                      </Suspense>
                    ) : (
                      <img src={photo.url} alt={room.name} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </motion.div>
        ))}
      </div>

      <div className="h-24" />

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a070d] via-[#0a070d] to-transparent z-40">
        <button
          onClick={() => setShowContact(true)}
          className="w-full h-[56px] bg-[#d100d9] text-[#0a070d] font-semibold text-[16px] rounded-[14px] flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Написати менеджеру
        </button>
      </div>

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
              className="fixed bottom-0 left-0 right-0 z-[60] bg-[#14101a] rounded-t-[24px] p-6"
            >
              <div className="w-10 h-1 rounded-full bg-[#333] mx-auto mb-5" />
              <h3 className="text-[20px] font-semibold text-[#f5f0fa] mb-1">Зв'язатися з менеджером</h3>
              <p className="text-[14px] text-[#a08fb0] mb-5">{tourData.property.agent.name}</p>
              
              <div className="space-y-3">
                {tourData.property.agent.phone ? (
                  <a
                    href={`tel:${tourData.property.agent.phone}`}
                    className="w-full h-14 bg-[#1a1422] rounded-[14px] flex items-center px-5 gap-3 text-[#f5f0fa] hover:bg-[#222] transition-colors"
                  >
                    <Phone className="w-5 h-5 text-[#d100d9]" />
                    <span className="text-[15px]">{tourData.property.agent.phone}</span>
                  </a>
                ) : null}
                {tourData.property.agent.email ? (
                  <a
                    href={`mailto:${tourData.property.agent.email}`}
                    className="w-full h-14 bg-[#1a1422] rounded-[14px] flex items-center px-5 gap-3 text-[#f5f0fa] hover:bg-[#222] transition-colors"
                  >
                    <Mail className="w-5 h-5 text-[#d100d9]" />
                    <span className="text-[15px]">{tourData.property.agent.email}</span>
                  </a>
                ) : null}
                {!tourData.property.agent.phone && !tourData.property.agent.email ? (
                  <p className="text-[13px] text-[#a08fb0]">Контакти менеджера недоступні</p>
                ) : null}
              </div>
              
              <button
                onClick={() => setShowContact(false)}
                className="w-full mt-4 h-12 text-[#a08fb0] text-[14px] font-medium"
              >
                Скасувати
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          >
            <button
              onClick={() => {
                setShowDepthTooltip(false);
                setShowPhoto(null);
              }}
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
            
            {DEPTH_ENABLED && showPhoto.depthUrl ? (
              <>
                {showDepthTooltip && (
                  <div className="absolute top-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-[13px] text-white backdrop-blur">
                    Нахили телефон 📱
                  </div>
                )}
                {shouldRequestOrientationPermission() && !orientationEnabled && (
                  <button
                    type="button"
                    onClick={enable3d}
                    className="absolute top-28 left-1/2 z-10 h-10 -translate-x-1/2 rounded-[10px] bg-[#d100d9] px-4 text-[13px] font-semibold text-[#0a070d]"
                  >
                    Увімкнути 3D
                  </button>
                )}
                <motion.div
                  key={`${showPhoto.url}-depth`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-[95vw] max-w-[900px] max-h-[85vh] aspect-[4/3] rounded-[8px]"
                >
                  <Suspense fallback={<img src={showPhoto.url} alt="" className="h-full w-full rounded-[8px] object-contain" />}>
                    <DepthViewer photoUrl={showPhoto.url} depthUrl={showPhoto.depthUrl} className="h-full w-full rounded-[8px]" />
                  </Suspense>
                </motion.div>
              </>
            ) : (
              <motion.img
                key={showPhoto.url}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={showPhoto.url}
                alt=""
                className="max-w-[95%] max-h-[85%] object-contain rounded-[8px]"
              />
            )}
            
            <button
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center z-10"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            
            <p className="absolute bottom-8 text-[13px] text-[#a08fb0] z-10">
              {lightboxIdx + 1} / {allPhotos.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
