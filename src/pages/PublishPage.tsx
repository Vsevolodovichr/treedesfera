import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, Globe, Eye, ExternalLink } from 'lucide-react';
import { useStore } from '../store';
import QRCode from 'qrcode';

export default function PublishPage() {
  const navigate = useNavigate();
  const { property, setTourSlug, setPublished, tourSlug, isPublished } = useStore();
  const [published, setPubState] = useState(isPublished);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [slug] = useState(() => {
    if (tourSlug) return tourSlug;
    const base = property?.shortName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'tour';
    return `${base}-${Date.now().toString(36).slice(-6)}`;
  });

  const publicUrl = `https://xatosfera.pp.ua/tour/${slug}`;

  const handlePublish = async () => {
    setPublished(true);
    setPubState(true);
    setTourSlug(slug);
    
    // Generate QR
    try {
      const dataUrl = await QRCode.toDataURL(publicUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#d4af37', light: '#0a0a0a' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      // ignore
    }
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
    <div className="min-h-screen px-4 pt-6 pb-28">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-[22px] font-semibold text-[#f5f5f5]">Опублікувати тур</h2>
        <p className="text-[14px] text-[#888] mt-1">{property?.address}</p>
      </motion.div>

      {/* Status Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 bg-[#141414] border border-white/[0.08] rounded-[16px] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              published ? 'bg-[rgba(74,222,128,0.15)]' : 'bg-[#1a1a1a]'
            }`}>
              <Globe className={`w-5 h-5 ${published ? 'text-[#4ade80]' : 'text-[#888]'}`} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#f5f5f5]">
                {published ? 'Опубліковано' : 'Приховано'}
              </p>
              <p className="text-[12px] text-[#888]">
                {published ? 'Тур доступний за посиланням' : 'Тур не доступний публічно'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handlePublish}
            className={`w-14 h-8 rounded-full relative transition-colors ${
              published ? 'bg-[#d4af37]' : 'bg-[#2a2a2a]'
            }`}
          >
            <motion.div
              animate={{ x: published ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow"
            />
          </button>
        </div>
      </motion.div>

      {/* Published Content */}
      {published && (
        <>
          {/* Public Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 bg-[#141414] border border-white/[0.08] rounded-[16px] p-5"
          >
            <label className="text-[12px] font-medium text-[#888] uppercase tracking-wider mb-3 block">
              Публічне посилання
            </label>
            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/[0.08] rounded-[12px] px-4 py-3">
              <span className="flex-1 text-[13px] text-[#f5f5f5] truncate font-mono">{publicUrl}</span>
              <button
                onClick={handleCopy}
                className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#d4af37] active:scale-95 transition-transform shrink-0"
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
            className="mt-4 bg-[#141414] border border-white/[0.08] rounded-[16px] p-5 flex flex-col items-center"
          >
            <label className="text-[12px] font-medium text-[#888] uppercase tracking-wider mb-4 block">
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
              <div className="w-44 h-44 bg-[#0a0a0a] border border-white/[0.08] rounded-[12px] flex items-center justify-center">
                <p className="text-[12px] text-[#555]">QR буде згенеровано</p>
              </div>
            )}
            <p className="text-[12px] text-[#888] mt-3">Відскануйте для відкриття туру</p>
          </motion.div>

          {/* Share Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 bg-[#141414] border border-white/[0.08] rounded-[16px] p-5"
          >
            <label className="text-[12px] font-medium text-[#888] uppercase tracking-wider mb-3 block">
              Поділитися
            </label>
            <div className="flex gap-3">
              {['Telegram', 'Viber', 'Email'].map((app) => (
                <button
                  key={app}
                  onClick={handleCopy}
                  className="flex-1 h-11 bg-[#1a1a1a] rounded-[12px] flex items-center justify-center text-[13px] font-medium text-[#f5f5f5] hover:bg-[#222] transition-colors"
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
              className="w-full h-14 border border-[rgba(212,175,55,0.3)] text-[#d4af37] rounded-[12px] flex items-center justify-center gap-2 text-[15px] font-medium hover:bg-[rgba(212,175,55,0.08)] transition-colors"
            >
              <Eye className="w-5 h-5" />
              Відкрити публічний тур
              <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>
        </>
      )}

      {/* Back to Start */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent max-w-[480px] mx-auto">
        <button
          onClick={() => navigate('/start')}
          className="w-full h-[56px] bg-[#d4af37] text-[#0a0a0a] font-semibold text-[15px] rounded-[12px] transition-all"
        >
          На головну
        </button>
      </div>
    </div>
  );
}
