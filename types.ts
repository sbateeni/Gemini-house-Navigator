
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
  createdBy?: string; // UUID of the creator (Normal Users)
  accessCode?: string; // For Source/Guest Users
  // New Security Field
  visibility?: 'public' | 'private';
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
  // New Granular Permissions
  can_edit_users: boolean;
  can_dispatch: boolean;
  can_view_logs: boolean;
}

// Added 'officer' between center_admin and user
export type UserRole = 'super_admin' | 'admin' | 'governorate_admin' | 'center_admin' | 'officer' | 'user' | 'banned' | 'source';

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
  last_seen?: number; // Timestamp for background activity tracking
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
  center?: string;
}

// New Interface for Source Codes
export interface AccessCode {
  code: string;
  created_by: string; // Officer ID
  created_at: number;
  expires_at: number;
  label?: string; // Optional name for the operation
  is_active: boolean;
  device_id?: string; // Linked device ID for security
}

export interface SourceSession {
  code: string;
  expiresAt: number;
  label?: string; // Operation Name
}
