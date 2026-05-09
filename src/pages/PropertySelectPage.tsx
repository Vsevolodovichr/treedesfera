import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Building2 } from 'lucide-react';
import { useStore } from '../store';
import { formatPropertyType, getProperties, getProperty, toCaptureProperty } from '../lib/api';
import type { ApiProperty } from '../types/api';

function statusClass(status?: string | null) {
  if (status === 'active') return 'bg-[rgba(74,222,128,0.15)] text-[#4ade80]';
  if (status === 'sold') return 'bg-[rgba(248,113,113,0.15)] text-[#f87171]';
  return 'bg-[rgba(209,0,217,0.15)] text-[#d100d9]';
}

function statusLabel(status?: string | null) {
  if (status === 'active') return 'Активний';
  if (status === 'sold') return 'Продано';
  return 'Чернетка';
}

export default function PropertySelectPage() {
  const navigate = useNavigate();
  const { setProperty, user } = useStore();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const propertiesQuery = useQuery({
    queryKey: ['properties', user?.agency_id, user?.role, user?.id, search],
    queryFn: () =>
      getProperties({
        agency: user?.agency_id || 'angels',
        search,
        assigned_to: user?.role === 'manager' ? user.id : undefined,
      }),
    enabled: !!user,
  });

  const properties = propertiesQuery.data ?? [];

  const handleSelect = async (prop: ApiProperty) => {
    setSelectedId(prop.id);
    try {
      const fullProperty = await getProperty(prop.id);
      setProperty(toCaptureProperty(fullProperty, user?.name || 'Агент'));
    } catch {
      setProperty(toCaptureProperty(prop, user?.name || 'Агент'));
    } finally {
      setSelectedId(null);
    }
    navigate('/plan');
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 bg-[#0a070d]/90 backdrop-blur-lg px-4 py-3 border-b border-[rgba(232,78,250,0.10)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a4d68]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за адресою..."
            className="w-full h-12 pl-10 pr-4 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[12px] text-[#f5f0fa] placeholder-[#5a4d68] text-[15px] focus:border-[#d100d9] focus:shadow-[0_0_0_3px_rgba(209,0,217,0.15)] transition-all outline-none"
          />
        </div>
      </div>

      {/* Property List */}
      <div className="px-4 pt-4 space-y-3">
        {propertiesQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-[#333] mb-4" />
            <p className="text-[#a08fb0] text-[15px]">Завантаження об'єктів...</p>
          </div>
        ) : propertiesQuery.isError ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-[#333] mb-4" />
            <p className="text-[#a08fb0] text-[15px]">Не вдалося завантажити об'єкти</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-[#333] mb-4" />
            <p className="text-[#a08fb0] text-[15px]">Об'єктів не знайдено</p>
            <p className="text-[#5a4d68] text-[13px] mt-1">Спробуйте змінити запит пошуку</p>
          </div>
        ) : (
          properties.map((prop, index) => (
            <motion.button
              key={prop.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(prop)}
              disabled={selectedId === prop.id}
              className="w-full text-left bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[12px] p-4 flex items-center gap-4 transition-all hover:border-[rgba(209,0,217,0.2)] disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-full bg-[#1a1422] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#a08fb0]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#f5f0fa] truncate">{prop.address}</p>
                <p className="text-[13px] text-[#a08fb0] mt-0.5">
                  {formatPropertyType(prop.type)} · {prop.rooms || 0} кімн.{prop.area ? ` · ${prop.area} м²` : ''}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-[11px] font-medium shrink-0 ${statusClass(prop.status)}`}
              >
                {selectedId === prop.id ? 'Вибір...' : statusLabel(prop.status)}
              </span>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
