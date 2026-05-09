import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Building2 } from 'lucide-react';
import { useStore } from '../store';

const mockProperties = [
  { id: '1', address: 'вул. Хрещатик, 22, кв. 15', type: 'Квартира', rooms: 3, area: 85, status: 'active' },
  { id: '2', address: 'просп. Перемоги, 45, кв. 120', type: 'Квартира', rooms: 2, area: 62, status: 'active' },
  { id: '3', address: 'вул. Льва Толстого, 10', type: 'Будинок', rooms: 5, area: 210, status: 'draft' },
  { id: '4', address: 'бул. Шевченка, 8, офіс 301', type: 'Комерція', rooms: 4, area: 150, status: 'active' },
  { id: '5', address: 'вул. Антоновича, 33, кв. 78', type: 'Квартира', rooms: 1, area: 45, status: 'sold' },
  { id: '6', address: 'вул. Драгоманова, 12, кв. 5', type: 'Квартира', rooms: 3, area: 92, status: 'active' },
];

export default function PropertySelectPage() {
  const navigate = useNavigate();
  const { setProperty } = useStore();
  const [search, setSearch] = useState('');

  const filtered = mockProperties.filter((p) =>
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (prop: typeof mockProperties[0]) => {
    setProperty({
      id: prop.id,
      type: prop.type === 'Квартира' ? 'apartment' : prop.type === 'Будинок' ? 'house' : 'commercial',
      address: prop.address,
      rooms: prop.rooms,
      area: prop.area,
      price: 0,
      dealType: 'sale',
      shortName: prop.address.split(',')[0],
      agent: 'Агент',
    });
    navigate('/plan');
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-lg px-4 py-3 border-b border-white/[0.08]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за адресою..."
            className="w-full h-12 pl-10 pr-4 bg-[#141414] border border-white/[0.08] rounded-[12px] text-[#f5f5f5] placeholder-[#555] text-[15px] focus:border-[#d4af37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.15)] transition-all outline-none"
          />
        </div>
      </div>

      {/* Property List */}
      <div className="px-4 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-[#333] mb-4" />
            <p className="text-[#888] text-[15px]">Об'єктів не знайдено</p>
            <p className="text-[#555] text-[13px] mt-1">Спробуйте змінити запит пошуку</p>
          </div>
        ) : (
          filtered.map((prop, index) => (
            <motion.button
              key={prop.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(prop)}
              className="w-full text-left bg-[#141414] border border-white/[0.08] rounded-[12px] p-4 flex items-center gap-4 transition-all hover:border-[rgba(212,175,55,0.2)]"
            >
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#888]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#f5f5f5] truncate">{prop.address}</p>
                <p className="text-[13px] text-[#888] mt-0.5">
                  {prop.type} · {prop.rooms} кімн. · {prop.area} м²
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                  prop.status === 'active'
                    ? 'bg-[rgba(74,222,128,0.15)] text-[#4ade80]'
                    : prop.status === 'sold'
                    ? 'bg-[rgba(248,113,113,0.15)] text-[#f87171]'
                    : 'bg-[rgba(212,175,55,0.15)] text-[#d4af37]'
                }`}
              >
                {prop.status === 'active' ? 'Активний' : prop.status === 'sold' ? 'Продано' : 'Чернетка'}
              </span>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
