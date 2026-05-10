import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import { GripVertical, Trash2, Plus, Utensils, Sofa, Bed, Bath, DoorOpen, Trees, Shirt, Archive, Camera, Home } from 'lucide-react';
import { useStore, roomTypeLabels } from '../store';
import type { Room, RoomType } from '../store';
import { BottomActionBar } from '../components/layout/BottomActionBar';

const roomIcons: Record<RoomType, React.ReactNode> = {
  kitchen: <Utensils className="w-4 h-4" />,
  living: <Sofa className="w-4 h-4" />,
  bedroom: <Bed className="w-4 h-4" />,
  bathroom: <Bath className="w-4 h-4" />,
  hallway: <DoorOpen className="w-4 h-4" />,
  room: <Home className="w-4 h-4" />,
  balcony: <Trees className="w-4 h-4" />,
  wardrobe: <Shirt className="w-4 h-4" />,
  storage: <Archive className="w-4 h-4" />,
  office: <Sofa className="w-4 h-4" />,
  garden: <Trees className="w-4 h-4" />,
  garage: <Archive className="w-4 h-4" />,
  terrace: <Trees className="w-4 h-4" />,
  basement: <Archive className="w-4 h-4" />,
  other: <Plus className="w-4 h-4" />,
};

export default function RoomSetupPage() {
  const navigate = useNavigate();
  const { rooms, setRooms } = useStore();
  const [items, setItems] = useState<Room[]>(rooms);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const isPanoEnabled = import.meta.env.VITE_PANO_ENABLED === 'true';
  const [newRoomName, setNewRoomName] = useState('');

  const toggleActive = (id: string) => {
    setItems(items.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  };

  const handleDelete = (id: string) => {
    setItems(items.filter((r) => r.id !== id));
  };

  const startEdit = (room: Room) => {
    setEditingId(room.id);
    setEditName(room.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      setItems(items.map((r) => (r.id === editingId ? { ...r, name: editName.trim() } : r)));
    }
    setEditingId(null);
    setEditName('');
  };

  const addRoom = () => {
    if (!newRoomName.trim()) return;
    const newRoom: Room = {
      id: 'room_' + Date.now(),
      name: newRoomName.trim(),
      type: 'other',
      order: items.length,
      active: true,
      status: 'pending',
      photos: [],
      qualityScore: 0,
    };
    setItems([...items, newRoom]);
    setNewRoomName('');
    setShowAdd(false);
  };

  const handleConfirm = () => {
    setRooms(items);
    navigate('/camera');
  };

  const handleStartPanorama = (roomId: string) => {
    setRooms(items);
    navigate(`/pano/${roomId}`);
  };

  return (
    <div className="min-h-full px-4 pt-4 pb-0">
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
        {items.map((room, index) => (
          <Reorder.Item key={room.id} value={room}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`flex items-center gap-3 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[12px] p-3 transition-opacity ${
                !room.active ? 'opacity-50' : ''
              }`}
            >
              {/* Drag handle */}
              <div className="cursor-grab active:cursor-grabbing text-[#5a4d68]">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Room icon */}
              <div className="w-10 h-10 rounded-full bg-[rgba(209,0,217,0.12)] flex items-center justify-center text-[#d100d9] shrink-0">
                {roomIcons[room.type]}
              </div>

              {/* Room name */}
              <div className="flex-1 min-w-0">
                {editingId === room.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    className="w-full bg-transparent text-[14px] font-medium text-[#f5f0fa] outline-none border-b border-[#d100d9]"
                  />
                ) : (
                  <button onClick={() => startEdit(room)} className="text-left w-full">
                    <p className="text-[14px] font-medium leading-5 text-[#f5f0fa]">{room.name}</p>
                    <p className="text-[11px] text-[#a08fb0]">
                      {roomTypeLabels[room.type]}
                      {isPanoEnabled && room.panorama?.status === 'ready' && <span className="ml-2 text-[#d4af37]">📐 Пано</span>}
                    </p>
                  </button>
                )}
                {isPanoEnabled && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => handleStartPanorama(room.id)}
                    className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-[#d4af37]/40 px-2.5 text-[11px] font-medium text-[#d4af37]"
                  >
                    <Camera className="w-3 h-3" />
                    Зняти панораму
                  </button>
                )}
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleActive(room.id)}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  room.active ? 'bg-[#d100d9]' : 'bg-[#241830]'
                }`}
              >
                <motion.div
                  animate={{ x: room.active ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow"
                />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(room.id)}
                className="w-11 h-11 flex items-center justify-center text-[#5a4d68] hover:text-[#f87171] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Add Room */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4">
        {showAdd ? (
          <div className="flex items-center gap-2 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[12px] p-3">
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Назва кімнати"
              className="flex-1 bg-transparent text-[14px] text-[#f5f0fa] placeholder-[#5a4d68] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addRoom()}
              autoFocus
            />
            <button onClick={addRoom} className="px-4 h-8 bg-[#d100d9] text-[#0a070d] text-[13px] font-medium rounded-full">
              Додати
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full h-12 border border-dashed border-[rgba(209,0,217,0.3)] rounded-[12px] flex items-center justify-center gap-2 text-[#d100d9] text-[14px] font-medium hover:bg-[rgba(209,0,217,0.05)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Додати кімнату
          </button>
        )}
      </motion.div>

      {/* Bottom Button */}
      <BottomActionBar>
        <button
          onClick={handleConfirm}
          className="w-full h-[56px] bg-[#d100d9] hover:bg-[#e84efa] active:bg-[#9d00a8] text-[#0a070d] font-semibold text-[15px] rounded-[12px] transition-all"
        >
          Підтвердити кімнати
        </button>
      </BottomActionBar>
    </div>
  );
}
