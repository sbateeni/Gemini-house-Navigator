
export interface MapNote {
  id: string;
  lat: number;
  lng: number;
  userNote: string;
  locationName: string;
  aiAnalysis: string;
  createdAt: number;
  sources?: GroundingSource[];
  status?: 'caught' | 'not_caught';
  // Hierarchy Fields
  governorate?: string;
  center?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  locationName: string;
  details: string;
  sources: GroundingSource[];
}

export interface RouteData {
  coordinates: [number, number][]; // Array of [lat, lng]
  distance: number; // in meters
  duration: number; // in seconds
}

export interface UserPermissions {
  can_create: boolean;
  can_see_others: boolean;
  can_navigate: boolean;
}

// Added 'admin' for backward compatibility
export type UserRole = 'super_admin' | 'admin' | 'governorate_admin' | 'center_admin' | 'user' | 'banned';

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  isApproved: boolean;
  email?: string;
  permissions: UserPermissions;
  // Hierarchy Fields
  governorate?: string;
  center?: string;
}

export type UnitStatus = 'patrol' | 'busy' | 'pursuit' | 'offline';

export interface MapUser {
  id: string;
  username: string;
  lat: number;
  lng: number;
  color: string;
  lastUpdated: number;
  // New Tactical Fields
  status: UnitStatus;
  isSOS: boolean;
}

export interface Assignment {
  id: string;
  targetUserId: string;
  locationId: string;
  locationName: string;
  lat: number;
  lng: number;
  instructions?: string;
  status: 'pending' | 'accepted' | 'completed';
  createdBy: string;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'alert' | 'info' | 'dispatch' | 'status';
  userId?: string;
  timestamp: number;
  governorate?: string;
}
