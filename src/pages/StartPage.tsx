import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Clock, ChevronRight, Download, Share } from 'lucide-react';
import { useStore } from '../store';
import { getDraftTours, getProperty, toCaptureProperty } from '../lib/api';
import type { VirtualTour } from '../types/api';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const cards = [
  {
    id: 'new',
    title: 'Новий об\'єкт',
    description: 'Почати нову зйомку нерухомості',
    icon: Plus,
    primary: true,
    path: '/property/new',
  },
  {
    id: 'existing',
    title: 'Існуючий об\'єкт',
    description: 'Додати інтерактив до оголошення',
    icon: Search,
    primary: false,
    path: '/property/select',
  },
  {
    id: 'draft',
    title: 'Продовжити чернетку',
    description: 'Завантаження чернеток',
    icon: Clock,
    primary: false,
    path: '',
    badge: 3,
  },
];

export default function StartPage() {
  const navigate = useNavigate();
  const { user, setProperty, setTourSlug } = useStore();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const draftsQuery = useQuery({
    queryKey: ['draft-tours', user?.id, user?.role],
    queryFn: () => getDraftTours({ manager_user_id: user?.role === 'manager' ? user.id : undefined }),
    enabled: !!user,
  });

  const draftTours = draftsQuery.data ?? [];
  const visibleCards = cards.map((card) =>
    card.id === 'draft'
      ? {
          ...card,
          description: draftsQuery.isLoading
            ? 'Завантаження чернеток'
            : draftTours.length > 0
              ? `${draftTours.length} активні чернетки`
              : 'Немає активних чернеток',
          badge: draftTours.length || undefined,
        }
      : card,
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleDraftSelect = async (draft: VirtualTour) => {
    setSelectedDraftId(draft.id);
    setTourSlug(draft.slug);
    try {
      const property = await getProperty(draft.property_id);
      setProperty(toCaptureProperty(property, user?.name || 'Агент'));
      navigate('/plan');
    } catch {
      navigate('/property/select');
    } finally {
      setSelectedDraftId(null);
    }
  };

  const handleCardClick = async (card: typeof visibleCards[0]) => {
    if (card.id === 'draft') {
      if (draftTours.length === 1) {
        await handleDraftSelect(draftTours[0]);
        return;
      }
      setShowDrafts((value) => !value);
      return;
    }
    navigate(card.path);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  return (
    <div className="min-h-screen px-4 pt-6 pb-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-[22px] font-semibold text-[#f5f5f5] tracking-[-0.01em]">
          Привіт, {user?.name || 'Агенте'}
        </h1>
        <p className="text-[14px] text-[#888] mt-1">Що будемо робити сьогодні?</p>
      </motion.div>

      {/* Cards */}
      <div className="space-y-3">
        {visibleCards.map((card, index) => {
          const Icon = card.icon;
          const isDisabled = card.id === 'draft' && (draftsQuery.isLoading || !card.badge);
          
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !isDisabled && void handleCardClick(card)}
              disabled={isDisabled}
              className={`w-full text-left rounded-[16px] p-5 flex items-center gap-4 transition-all ${
                card.primary
                  ? 'bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.2)]'
                  : 'bg-[#141414] border border-white/[0.08]'
              } ${isDisabled ? 'opacity-50' : 'active:scale-[0.98]'}`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  card.primary ? 'bg-[rgba(212,175,55,0.2)]' : 'bg-[#1a1a1a]'
                }`}
              >
                <Icon className={`w-5 h-5 ${card.primary ? 'text-[#d4af37]' : 'text-[#888]'}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-semibold text-[#f5f5f5]">{card.title}</h3>
                  {card.badge ? (
                    <span className="w-5 h-5 rounded-full bg-[#d4af37] text-[#0a0a0a] text-[11px] font-bold flex items-center justify-center">
                      {card.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-[13px] text-[#888] mt-0.5">{card.description}</p>
              </div>

              <ChevronRight className={`w-5 h-5 shrink-0 ${card.primary ? 'text-[#d4af37]' : 'text-[#555]'}`} />
            </motion.button>
          );
        })}
      </div>

      {showDrafts && draftTours.length > 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-2"
        >
          {draftTours.map((draft) => (
            <button
              key={draft.id}
              onClick={() => void handleDraftSelect(draft)}
              disabled={selectedDraftId === draft.id}
              className="w-full rounded-[12px] border border-white/[0.08] bg-[#141414] px-4 py-3 text-left disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#f5f5f5]">{draft.slug}</p>
                  <p className="mt-0.5 text-[12px] text-[#888]">Оновлено {new Date(draft.updated_at).toLocaleDateString('uk-UA')}</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-[#555]" />
              </div>
            </button>
          ))}
        </motion.div>
      ) : null}

      {!isStandalone && (installPrompt || isIos) ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mt-5 rounded-[16px] border border-white/[0.08] bg-[#141414] p-4"
        >
          {installPrompt ? (
            <button
              onClick={handleInstall}
              className="w-full h-11 rounded-[12px] bg-[#d4af37] text-[#0a0a0a] text-[14px] font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Встановити
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                <Share className="w-4 h-4 text-[#d4af37]" />
              </div>
              <p className="text-[13px] leading-5 text-[#b8b8b8]">iPhone: Поділитися → На головний екран</p>
            </div>
          )}
        </motion.div>
      ) : null}

      {/* Bottom decorative element */}
      <div className="mt-12 flex justify-center">
        <div className="w-12 h-1 rounded-full bg-white/[0.08]" />
      </div>
    </div>
  );
}
