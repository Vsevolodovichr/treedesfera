import { create } from 'zustand';

export type RoomType = 'kitchen' | 'living' | 'bedroom' | 'bathroom' | 'hallway' | 'balcony' | 'wardrobe' | 'storage' | 'office' | 'garden' | 'garage' | 'terrace' | 'basement' | 'other';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  order: number;
  active: boolean;
  status: 'pending' | 'capturing' | 'completed' | 'rework';
  photos: Photo[];
  qualityScore: number;
  floorPlanX?: number;
  floorPlanY?: number;
}

export interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  type: string;
  qualityScore: number;
  status: 'accepted' | 'warning' | 'rejected';
  issues: string[];
}

export interface Property {
  id: string;
  type: 'apartment' | 'house' | 'commercial';
  address: string;
  rooms: number;
  area?: number;
  floor?: number;
  price: number;
  dealType: 'sale' | 'rent';
  shortName: string;
  agent: string;
}

export interface FloorPlan {
  imageUrl: string;
  hotspots: Hotspot[];
}

export interface Hotspot {
  id: string;
  roomId: string;
  x: number;
  y: number;
  label: string;
}

export interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: { name: string; email: string; agency: string } | null;
  
  // Navigation
  currentScreen: string;
  previousScreen: string | null;
  
  // Property
  property: Property | null;
  draftProperty: Partial<Property> | null;
  
  // Floor Plan
  floorPlan: FloorPlan | null;
  
  // Rooms
  rooms: Room[];
  currentRoomIndex: number;
  
  // Capture
  currentShotIndex: number;
  
  // Tour
  tourSlug: string | null;
  isPublished: boolean;
  
  // Actions
  setAuthenticated: (val: boolean) => void;
  setUser: (user: AppState['user']) => void;
  setScreen: (screen: string) => void;
  goBack: () => void;
  setProperty: (property: Property) => void;
  setDraftProperty: (draft: Partial<Property> | null) => void;
  setFloorPlan: (plan: FloorPlan | null) => void;
  setRooms: (rooms: Room[]) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  setCurrentRoomIndex: (index: number) => void;
  addPhotoToRoom: (roomId: string, photo: Photo) => void;
  setCurrentShotIndex: (index: number) => void;
  setTourSlug: (slug: string | null) => void;
  setPublished: (val: boolean) => void;
  reset: () => void;
}

const defaultRooms: Room[] = [
  { id: '1', name: 'Кухня', type: 'kitchen', order: 0, active: true, status: 'pending', photos: [], qualityScore: 0 },
  { id: '2', name: 'Вітальня', type: 'living', order: 1, active: true, status: 'pending', photos: [], qualityScore: 0 },
  { id: '3', name: 'Спальня', type: 'bedroom', order: 2, active: true, status: 'pending', photos: [], qualityScore: 0 },
  { id: '4', name: 'Ванна кімната', type: 'bathroom', order: 3, active: true, status: 'pending', photos: [], qualityScore: 0 },
  { id: '5', name: 'Коридор', type: 'hallway', order: 4, active: true, status: 'pending', photos: [], qualityScore: 0 },
];

const initialState = {
  isAuthenticated: false,
  user: null,
  currentScreen: 'login',
  previousScreen: null,
  property: null,
  draftProperty: null,
  floorPlan: null,
  rooms: defaultRooms,
  currentRoomIndex: 0,
  currentShotIndex: 0,
  tourSlug: null,
  isPublished: false,
};

export const useStore = create<AppState>((set, get) => ({
  ...initialState,
  
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setUser: (user) => set({ user }),
  setScreen: (screen) => set({ previousScreen: get().currentScreen, currentScreen: screen }),
  goBack: () => {
    const { previousScreen } = get();
    if (previousScreen) {
      set({ currentScreen: previousScreen, previousScreen: null });
    }
  },
  setProperty: (property) => set({ property }),
  setDraftProperty: (draftProperty) => set({ draftProperty }),
  setFloorPlan: (floorPlan) => set({ floorPlan }),
  setRooms: (rooms) => set({ rooms }),
  updateRoom: (id, updates) => set((state) => ({
    rooms: state.rooms.map((r) => r.id === id ? { ...r, ...updates } : r)
  })),
  setCurrentRoomIndex: (index) => set({ currentRoomIndex: index }),
  addPhotoToRoom: (roomId, photo) => set((state) => ({
    rooms: state.rooms.map((r) =>
      r.id === roomId ? { ...r, photos: [...r.photos, photo] } : r
    )
  })),
  setCurrentShotIndex: (index) => set({ currentShotIndex: index }),
  setTourSlug: (slug) => set({ tourSlug: slug }),
  setPublished: (val) => set({ isPublished: val }),
  reset: () => set(initialState),
}));

export const roomIcons: Record<RoomType, string> = {
  kitchen: 'utensils',
  living: 'sofa',
  bedroom: 'bed',
  bathroom: 'bath',
  hallway: 'door-open',
  balcony: 'trees',
  wardrobe: 'shirt',
  storage: 'archive',
  office: 'briefcase',
  garden: 'flower-2',
  garage: 'car',
  terrace: 'umbrella',
  basement: 'container',
  other: 'box',
};

export const roomTypeLabels: Record<RoomType, string> = {
  kitchen: 'Кухня',
  living: 'Вітальня',
  bedroom: 'Спальня',
  bathroom: 'Ванна',
  hallway: 'Коридор',
  balcony: 'Балкон',
  wardrobe: 'Гардероб',
  storage: 'Комора',
  office: 'Офіс',
  garden: 'Сад',
  garage: 'Гараж',
  terrace: 'Тераса',
  basement: 'Підвал',
  other: 'Інше',
};

export const shotInstructions = [
  { text: 'Станьте в дальній кут кімнати', type: 'wide' },
  { text: 'Тримайте телефон рівно', type: 'level' },
  { text: 'Зробіть широке фото всієї кімнати', type: 'wide_full' },
  { text: 'Тепер зніміть дверний прохід', type: 'doorway' },
  { text: 'Зніміть вікно і джерело світла', type: 'window' },
  { text: 'Зробіть фото деталей, які продають об\'єкт', type: 'detail' },
];

export const qualityMessages: Record<string, string> = {
  too_dark: 'Занадто темно. Увімкніть світло або підійдіть до вікна.',
  blurry: 'Фото розмите. Зробіть ще раз повільніше.',
  no_doorway: 'Не видно дверний прохід. Станьте далі.',
  person: 'На фото є людина — краще перезняти',
  too_bright: 'Фото пересвічене. Відійдіть від вікна.',
  crooked: 'Фото перекошене. Тримайте телефон рівніше.',
};
