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

export interface VirtualTourRoom {
  id: string;
  photos?: unknown[];
  panoramaUrl?: string | null;
  hfov?: number | null;
  yawOffset?: number | null;
}

export interface VirtualTour {
  id: string;
  agency_id: string;
  property_id: string;
  slug: string;
  floor_plan_key?: string | null;
  hotspots: unknown[];
  rooms: VirtualTourRoom[];
  status: TourStatus;
  manager_user_id: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}
