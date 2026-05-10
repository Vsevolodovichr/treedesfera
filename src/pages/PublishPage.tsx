import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, Globe, Eye, ExternalLink, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { publishTour, uploadTourPanorama, uploadTourPhoto } from '../lib/api';
import { getDepth } from '../lib/depth/storage';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import QRCode from 'qrcode';

const PUBLIC_TOUR_BASE_URL = (import.meta.env.VITE_PUBLIC_TOUR_BASE_URL || `${window.location.origin}/tour`).replace(/\/$/, '');
const DEPTH_ENABLED = import.meta.env.VITE_DEPTH_ENABLED !== 'false';
const PANO_ENABLED = import.meta.env.VITE_PANO_ENABLED === 'true';

interface PublishIssue {
  message: string;
  path: string;
  roomIndex?: number;
}

export default function PublishPage() {
  const navigate = useNavigate();
  const { property, rooms, floorPlan, setCurrentRoomIndex, setTourSlug, setPublished, tourSlug, isPublished } = useStore();
  const [published, setPubState] = useState(isPublished);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<PublishIssue[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [slug, setSlug] = useState(() => {
    if (tourSlug) return tourSlug;
    const base = property?.shortName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'tour';
    return `${base}-${Date.now().toString(36).slice(-6)}`;
  });

  const publicUrl = `${PUBLIC_TOUR_BASE_URL}/${slug}`;

  const getPublishIssues = () => {
    const issues: PublishIssue[] = [];
    const activeRooms = rooms.filter((room) => room.active);

    activeRooms.forEach((room, roomIndex) => {
      const usablePhotos = room.photos.filter((photo) => photo.status !== 'rejected');
      const averageScore = usablePhotos.length
        ? Math.round(usablePhotos.reduce((sum, photo) => sum + photo.qualityScore, 0) / usablePhotos.length)
        : 0;

      if (usablePhotos.length < 3) {
        issues.push({
          message: `${room.name}: потрібно мінімум 3 фото без rejected`,
          path: '/camera',
          roomIndex,
        });
      }

      if (averageScore < 60) {
        issues.push({
          message: `${room.name}: середній qualityScore ${averageScore}, потрібно 60+`,
          path: '/camera',
          roomIndex,
        });
      }
    });

    return issues;
  };

  const handlePublish = async () => {
    const issues = getPublishIssues();
    if (issues.length > 0) {
      setValidationIssues(issues);
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    let publishedSlug = slug;

    if (property?.id) {
      try {
        for (const room of rooms.filter((item) => item.active)) {
          for (const photo of room.photos.filter((item) => item.status !== 'rejected')) {
            const response = await fetch(photo.url);
            if (!response.ok) throw new Error('photo_fetch_failed');
            const photoBlob = await response.blob();
            const photoFile = new File([photoBlob], `${photo.id}.jpg`, { type: photoBlob.type || 'image/jpeg' });
            const depth = DEPTH_ENABLED && photo.depthStatus === 'ready' ? await getDepth(photo.id) : null;
            await uploadTourPhoto(
              property.id,
              photoFile,
              {
                room_id: room.id,
                photo_id: photo.id,
                photo_type: photo.type,
                quality_score: photo.qualityScore,
              },
              depth?.blob,
            );
            if (depth) URL.revokeObjectURL(depth.url);
          }
          if (PANO_ENABLED && room.panorama?.status === 'ready' && room.panorama.equirectangularUrl) {
            const response = await fetch(room.panorama.equirectangularUrl);
            if (!response.ok) throw new Error('panorama_fetch_failed');
            const panoramaBlob = await response.blob();
            const panoramaFile = new File([panoramaBlob], 'panorama.jpg', { type: 'image/jpeg' });
            await uploadTourPanorama(property.id, room.id, panoramaFile, {
              hfov: room.panorama.hfov ?? 360,
              yawOffset: room.panorama.yawOffset,
            });
          }
        }
        const tour = await publishTour(property.id, true);
        publishedSlug = tour.slug || slug;
        setSlug(publishedSlug);
      } catch {
        setPublishError('Не вдалося опублікувати тур');
        setIsPublishing(false);
        return;
      }
    }

    setPublished(true);
    setPubState(true);
    setTourSlug(publishedSlug);
    
    try {
      const dataUrl = await QRCode.toDataURL(`${PUBLIC_TOUR_BASE_URL}/${publishedSlug}`, {
        width: 200,
        margin: 2,
        color: { dark: '#d100d9', light: '#0a070d' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }

    setIsPublishing(false);
  };

  const handleFixIssue = () => {
    const issue = validationIssues[0];
    if (!issue) return;
    if (typeof issue.roomIndex === 'number') setCurrentRoomIndex(issue.roomIndex);
    setValidationIssues([]);
    navigate(issue.path);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenTour = () => {
    window.open(`/tour/${slug}`, '_blank');
  };

  return (
    <div className="min-h-full px-4 pt-4 pb-0">
      {/* Status Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[16px] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              published ? 'bg-[rgba(74,222,128,0.15)]' : 'bg-[#1a1422]'
            }`}>
              <Globe className={`w-5 h-5 ${published ? 'text-[#4ade80]' : 'text-[#a08fb0]'}`} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#f5f0fa]">
                {published ? 'Опубліковано' : 'Приховано'}
              </p>
              <p className="text-[12px] text-[#a08fb0]">
                {published ? 'Тур доступний за посиланням' : 'Тур не доступний публічно'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className={`w-14 h-8 rounded-full relative transition-colors ${
              published ? 'bg-[#d100d9]' : 'bg-[#241830]'
            } disabled:opacity-60`}
          >
            <motion.div
              animate={{ x: published ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow"
            />
          </button>
        </div>
      </motion.div>

      {!floorPlan?.imageUrl && (
        <p className="mt-3 text-center text-[12px] text-[#a08fb0]">План приміщення не додано, тур можна опублікувати без нього.</p>
      )}

      {publishError && <p className="mt-3 text-center text-[12px] text-[#f87171]">{publishError}</p>}

      {/* Published Content */}
      {published && (
        <>
          {/* Public Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[16px] p-5"
          >
            <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-wider mb-3 block">
              Публічне посилання
            </label>
            <div className="flex items-center gap-2 bg-[#0a070d] border border-[rgba(232,78,250,0.10)] rounded-[12px] px-4 py-3">
              <span className="flex-1 text-[13px] text-[#f5f0fa] truncate font-mono">{publicUrl}</span>
              <button
                onClick={handleCopy}
                className="w-9 h-9 rounded-full bg-[#1a1422] flex items-center justify-center text-[#d100d9] active:scale-95 transition-transform shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[12px] text-[#4ade80] mt-2"
              >
                Скопійовано!
              </motion.p>
            )}
          </motion.div>

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[16px] p-5 flex flex-col items-center"
          >
            <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-wider mb-4 block">
              QR-код
            </label>
            {qrDataUrl ? (
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={qrDataUrl}
                alt="QR Code"
                className="w-44 h-44 object-contain"
              />
            ) : (
              <div className="w-44 h-44 bg-[#0a070d] border border-[rgba(232,78,250,0.10)] rounded-[12px] flex items-center justify-center">
                <p className="text-[12px] text-[#5a4d68]">QR буде згенеровано</p>
              </div>
            )}
            <p className="text-[12px] text-[#a08fb0] mt-3">Відскануйте для відкриття туру</p>
          </motion.div>

          {/* Share Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[16px] p-5"
          >
            <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-wider mb-3 block">
              Поділитися
            </label>
            <div className="flex gap-3">
              {['Telegram', 'Viber', 'Email'].map((app) => (
                <button
                  key={app}
                  onClick={handleCopy}
                  className="flex-1 h-11 bg-[#1a1422] rounded-[12px] flex items-center justify-center text-[13px] font-medium text-[#f5f0fa] hover:bg-[#222] transition-colors"
                >
                  {app}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Open Tour */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <button
              onClick={handleOpenTour}
              className="w-full h-14 border border-[rgba(209,0,217,0.3)] text-[#d100d9] rounded-[12px] flex items-center justify-center gap-2 text-[15px] font-medium hover:bg-[rgba(209,0,217,0.08)] transition-colors"
            >
              <Eye className="w-5 h-5" />
              Відкрити публічний тур
              <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>
        </>
      )}

      {/* Back to Start */}
      <BottomActionBar>
        <button
          onClick={() => navigate('/start')}
          className="w-full h-[56px] bg-[#d100d9] text-[#0a070d] font-semibold text-[15px] rounded-[12px] transition-all"
        >
          На головну
        </button>
      </BottomActionBar>

      {validationIssues.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 pb-4">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-[480px] mx-auto rounded-[20px] border border-[rgba(232,78,250,0.10)] bg-[#14101a] p-5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#facc15]" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#f5f0fa]">Потрібно виправити перед публікацією</h3>
                <div className="mt-3 space-y-2">
                  {validationIssues.map((issue) => (
                    <p key={issue.message} className="text-[13px] leading-5 text-[#b8a8c8]">{issue.message}</p>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleFixIssue}
              className="mt-5 h-12 w-full rounded-[12px] bg-[#d100d9] text-[14px] font-semibold text-[#0a070d]"
            >
              Перейти до фікса
            </button>
            <button
              onClick={() => setValidationIssues([])}
              className="mt-2 h-10 w-full text-[13px] font-medium text-[#a08fb0]"
            >
              Закрити
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
