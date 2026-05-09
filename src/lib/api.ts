import type { Property } from '../store';
import { apiFetch, loginRequest, refreshSession as refreshAuthSession } from '../integrations/xatosfera/client';
import type {
  ApiProperty,
  ApiPropertyType,
  ApiUser,
  AuthUser,
  CreatePropertyPayload,
  VirtualTour,
} from '../types/api';

type ListResponse<T> = T[] | { data?: T[]; items?: T[]; properties?: T[]; users?: T[]; tours?: T[] };

function toList<T>(response: ListResponse<T>) {
  if (Array.isArray(response)) return response;
  return response.data || response.items || response.properties || response.users || response.tours || [];
}

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

function normalizePropertyType(type: string): ApiPropertyType {
  if (type === 'house') return 'house';
  if (type === 'commercial') return 'commercial';
  return 'apartment';
}

export function toStoreUser(user: AuthUser) {
  return {
    ...user,
    agency: user.agency_name,
  };
}

export function formatPropertyType(type: string) {
  const normalized = normalizePropertyType(type);
  if (normalized === 'house') return 'Будинок';
  if (normalized === 'commercial') return 'Комерція';
  return 'Квартира';
}

export function toCaptureProperty(property: ApiProperty, agent: string): Property {
  return {
    id: property.id,
    type: normalizePropertyType(property.type),
    address: property.address,
    rooms: Number(property.rooms || 0),
    area: property.area || undefined,
    floor: property.floor || undefined,
    price: Number(property.price || 0),
    dealType: property.deal_type === 'rent' ? 'rent' : 'sale',
    shortName: property.address.split(',')[0] || 'Об\'єкт',
    agent: property.manager_name || agent,
  };
}

export function login(email: string, password: string) {
  return loginRequest(email, password);
}

export function refreshSession() {
  return refreshAuthSession();
}

export async function getProperties(params: { agency?: string; search?: string; assigned_to?: string }) {
  const response = await apiFetch<ListResponse<ApiProperty>>(`/api/properties${buildQuery(params)}`);
  return toList(response);
}

export function getProperty(id: string) {
  return apiFetch<ApiProperty>(`/api/properties/${encodeURIComponent(id)}`);
}

export function createProperty(payload: CreatePropertyPayload) {
  return apiFetch<ApiProperty>('/api/properties', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUsers(params: { role?: string }) {
  const response = await apiFetch<ListResponse<ApiUser>>(`/api/users${buildQuery(params)}`);
  return toList(response);
}

export async function getDraftTours(params: { manager_user_id?: string }) {
  const response = await apiFetch<ListResponse<VirtualTour>>(
    `/api/tours${buildQuery({ status: 'draft', manager_user_id: params.manager_user_id })}`,
  );
  return toList(response);
}

export function upsertTour(propertyId: string, payload: Partial<VirtualTour>) {
  return apiFetch<VirtualTour>(`/api/properties/${encodeURIComponent(propertyId)}/tour`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function uploadFloorPlan(propertyId: string, file: File) {
  const formData = new FormData();
  formData.set('file', file);
  return apiFetch<VirtualTour>(`/api/properties/${encodeURIComponent(propertyId)}/tour/floor-plan`, {
    method: 'POST',
    body: formData,
  });
}

export function uploadTourPhoto(
  propertyId: string,
  file: File,
  meta: { room_id: string; photo_type: string; quality_score?: number; photo_id?: string },
  depth?: Blob,
) {
  const formData = new FormData();
  formData.set('file', file);
  formData.set('room_id', meta.room_id);
  formData.set('photo_type', meta.photo_type);
  if (meta.photo_id) formData.set('photo_id', meta.photo_id);
  if (meta.quality_score !== undefined) formData.set('quality_score', String(meta.quality_score));
  if (depth) formData.set('depth', depth, `${meta.photo_id || file.name}.depth.png`);
  return apiFetch<VirtualTour>(`/api/properties/${encodeURIComponent(propertyId)}/tour/photos`, {
    method: 'POST',
    body: formData,
  });
}

export function publishTour(propertyId: string, published: boolean) {
  return apiFetch<VirtualTour>(`/api/properties/${encodeURIComponent(propertyId)}/tour/publish`, {
    method: 'PUT',
    body: JSON.stringify({ published }),
  });
}

export function getPublicTour(slug: string) {
  return apiFetch<VirtualTour>(`/api/public/tours/${encodeURIComponent(slug)}`, {}, false);
}

export function postPublicTourView(slug: string, payload: { room_id?: string; time_on_room_ms?: number }) {
  return apiFetch<void>(
    `/api/public/tours/${encodeURIComponent(slug)}/view`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    false,
  );
}
