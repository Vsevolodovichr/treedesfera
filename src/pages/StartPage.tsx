import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Clock, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

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
    description: '3 активні чернетки',
    icon: Clock,
    primary: false,
    path: '',
    badge: 3,
  },
];

export default function StartPage() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);

  const handleCardClick = (card: typeof cards[0]) => {
    if (card.id === 'draft') {
      // Mock drafts - navigate to property new with mock data
      navigate('/property/new');
      return;
    }
    navigate(card.path);
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
        {cards.map((card, index) => {
          const Icon = card.icon;
          const isDisabled = card.id === 'draft' && !card.badge;
          
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !isDisabled && handleCardClick(card)}
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

      {/* Bottom decorative element */}
      <div className="mt-12 flex justify-center">
        <div className="w-12 h-1 rounded-full bg-white/[0.08]" />
      </div>
    </div>
  );
}
