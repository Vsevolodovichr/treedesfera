export type UserRole = 'superuser' | 'top_manager' | 'manager';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agency_id: string;
  agency_name: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface RefreshResponse {
  access: string;
  refresh?: string;
  user?: AuthUser;
}

export type ApiPropertyType = 'apartment' | 'house' | 'commercial';
export type ApiDealType = 'sale' | 'rent';

export interface ApiProperty {
  id: string;
  type: ApiPropertyType | string;
  address: string;
  rooms?: number | null;
  area?: number | null;
  floor?: number | null;
  price?: number | null;
  deal_type?: ApiDealType | string | null;
  assigned_to_user_id?: string | null;
  owner_phones?: string[] | null;
  status?: string | null;
  manager_name?: string | null;
}

export interface CreatePropertyPayload {
  type: ApiPropertyType;
  address: string;
  rooms: number;
  area?: number;
  floor?: number;
  price: number;
  deal_type: ApiDealType;
  assigned_to_user_id?: string;
  owner_phones: string[];
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agency_id: string;
  agency_name?: string;
}

export type TourStatus = 'draft' | 'published';

export interface VirtualTourPhoto {
  id: string;
  key?: string;
  url?: string;
  thumbnail?: string;
  depthKey?: string | null;
  depthUrl?: string | null;
  type?: string;
  qualityScore?: number;
  hasDepth?: boolean;
  status?: 'accepted' | 'warning' | 'rejected';
  issues?: string[];
}

export interface VirtualTourRoom {
  id: string;
  name?: string;
  label?: string;
  type?: string;
  photos?: VirtualTourPhoto[];
  panoramaKey?: string | null;
  panoramaUrl?: string | null;
  panorama_url?: string | null;
  hfov?: number | null;
  yawOffset?: number | null;
  yaw_offset?: number | null;
}

export interface VirtualTourHotspot {
  id?: string;
  roomId?: string;
  room_id?: string;
  x: number;
  y: number;
  label?: string;
}

export interface VirtualTourProperty {
  id?: string;
  address?: string;
  price?: number | null;
  currency?: string | null;
  rooms?: number | null;
  area?: number | null;
  area_total?: number | null;
  floor?: number | null;
  floors_total?: number | null;
  totalFloors?: number | null;
  description?: string | null;
  agent?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export interface VirtualTour {
  id: string;
  agency_id: string;
  property_id: string;
  slug: string;
  floor_plan_key?: string | null;
  floor_plan_url?: string | null;
  hotspots: VirtualTourHotspot[];
  rooms: VirtualTourRoom[];
  status: TourStatus;
  manager_user_id: string;
  manager_name?: string | null;
  property?: VirtualTourProperty | null;
  address?: string | null;
  price?: number | null;
  currency?: string | null;
  description?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}
