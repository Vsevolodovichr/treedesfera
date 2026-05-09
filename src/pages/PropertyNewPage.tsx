import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { useStore } from '../store';
import { createProperty, getUsers, toCaptureProperty } from '../lib/api';

type PropertyType = 'apartment' | 'house' | 'commercial';
type DealType = 'sale' | 'rent';

export default function PropertyNewPage() {
  const navigate = useNavigate();
  const { setProperty, user } = useStore();
  const [type, setType] = useState<PropertyType>('apartment');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState(2);
  const [area, setArea] = useState('');
  const [floor, setFloor] = useState('');
  const [price, setPrice] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [dealType, setDealType] = useState<DealType>('sale');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const canSelectManager = user?.role === 'top_manager' || user?.role === 'superuser';

  const managersQuery = useQuery({
    queryKey: ['users', 'manager', user?.agency_id],
    queryFn: () => getUsers({ role: 'manager' }),
    enabled: canSelectManager,
  });

  const effectiveAssignedToUserId = canSelectManager ? assignedToUserId || managersQuery.data?.[0]?.id || '' : user?.id || '';
  const selectedManager = managersQuery.data?.find((manager) => manager.id === effectiveAssignedToUserId);
  const agentName = selectedManager?.name || user?.name || 'Агент';

  const createPropertyMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setProperty(toCaptureProperty(property, agentName));
      navigate('/plan');
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (address.length < 5) e.address = 'Мінімум 5 символів';
    if (!price) e.price = 'Вкажіть ціну';
    if (canSelectManager && managersQuery.data?.length && !effectiveAssignedToUserId) e.assignedToUserId = 'Оберіть менеджера';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    try {
      await createPropertyMutation.mutateAsync({
        type,
        address,
        rooms,
        area: Number(area) || undefined,
        floor: Number(floor) || undefined,
        price: Number(price),
        deal_type: dealType,
        assigned_to_user_id: effectiveAssignedToUserId,
        owner_phones: ownerPhone.trim() ? [ownerPhone.trim()] : [],
      });
    } catch {
      setErrors((current) => ({ ...current, api: 'Не вдалося створити об\'єкт' }));
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full h-[56px] px-4 bg-[#14101a] border rounded-[12px] text-[#f5f0fa] placeholder-[#5a4d68] text-[16px] transition-all outline-none ${
      hasError ? 'border-[#f87171]' : 'border-[rgba(232,78,250,0.10)] focus:border-[#d100d9] focus:shadow-[0_0_0_3px_rgba(209,0,217,0.15)]'
    }`;

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[22px] font-semibold text-[#f5f0fa] mb-6"
      >
        Новий об'єкт
      </motion.h2>

      <div className="space-y-5">
        {/* Type Selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Тип нерухомості</label>
          <div className="flex gap-2 bg-[#14101a] p-1 rounded-full">
            {([['apartment', 'Квартира'], ['house', 'Будинок'], ['commercial', 'Комерція']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 h-10 rounded-full text-[14px] font-medium transition-all ${
                  type === t
                    ? 'bg-[rgba(209,0,217,0.2)] text-[#d100d9]'
                    : 'text-[#a08fb0] hover:text-[#f5f0fa]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Address */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Адреса *</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="вул. Хрещатик, 15, кв. 42"
            className={inputClass(!!errors.address)}
          />
          {errors.address && <p className="text-[#f87171] text-[12px] mt-1">{errors.address}</p>}
        </motion.div>

        {/* Rooms Stepper */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Кількість кімнат *</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setRooms(Math.max(1, rooms - 1))}
              className="w-11 h-11 rounded-full bg-[#1a1422] flex items-center justify-center text-[#f5f0fa] active:bg-[#241830] transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-[20px] font-semibold text-[#f5f0fa] w-8 text-center">{rooms}</span>
            <button
              onClick={() => setRooms(Math.min(20, rooms + 1))}
              className="w-11 h-11 rounded-full bg-[#1a1422] flex items-center justify-center text-[#f5f0fa] active:bg-[#241830] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Area & Floor Row */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-3">
          <div className="flex-1">
            <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Площа, м²</label>
            <input
              type="number"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="65"
              className={inputClass(false)}
            />
          </div>
          <div className="flex-1">
            <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Поверх</label>
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="5"
              className={inputClass(false)}
            />
          </div>
        </motion.div>

        {/* Price */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Ціна *</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="120000"
            className={inputClass(!!errors.price)}
          />
          {errors.price && <p className="text-[#f87171] text-[12px] mt-1">{errors.price}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Телефон власника</label>
          <input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+380..."
            className={inputClass(false)}
          />
        </motion.div>

        {/* Deal Type */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Тип угоди</label>
          <div className="flex gap-2 bg-[#14101a] p-1 rounded-full">
            {([['sale', 'Продаж'], ['rent', 'Оренда']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setDealType(t)}
                className={`flex-1 h-10 rounded-full text-[14px] font-medium transition-all ${
                  dealType === t
                    ? 'bg-[rgba(209,0,217,0.2)] text-[#d100d9]'
                    : 'text-[#a08fb0] hover:text-[#f5f0fa]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Agent */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <label className="text-[12px] font-medium text-[#a08fb0] uppercase tracking-[0.02em] mb-2 block">Відповідальний агент</label>
          {canSelectManager ? (
            <>
              <select
                value={effectiveAssignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                disabled={managersQuery.isLoading}
                className={inputClass(!!errors.assignedToUserId)}
              >
                {managersQuery.isLoading ? (
                  <option value="">Завантаження...</option>
                ) : managersQuery.data?.length ? (
                  managersQuery.data.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))
                ) : (
                  <option value="">Менеджерів не знайдено</option>
                )}
              </select>
              {errors.assignedToUserId && <p className="text-[#f87171] text-[12px] mt-1">{errors.assignedToUserId}</p>}
            </>
          ) : (
            <div className="w-full h-[56px] px-4 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[12px] flex items-center text-[#f5f0fa] opacity-70">
              {agentName}
            </div>
          )}
        </motion.div>
      </div>

      {/* Sticky Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a070d] via-[#0a070d] to-transparent max-w-[480px] mx-auto">
        {errors.api && <p className="text-[#f87171] text-[12px] mb-2 text-center">{errors.api}</p>}
        <button
          onClick={handleNext}
          disabled={createPropertyMutation.isPending}
          className="w-full h-[56px] bg-[#d100d9] hover:bg-[#e84efa] active:bg-[#9d00a8] text-[#0a070d] font-semibold text-[15px] rounded-[12px] transition-all disabled:opacity-60"
        >
          {createPropertyMutation.isPending ? 'Створення...' : 'Далі'}
        </button>
      </div>
    </div>
  );
}
