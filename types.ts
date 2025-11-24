
export interface MapNote {
  id: string;
  lat: number;
  lng: number;
  userNote: string;
  locationName: string;
  aiAnalysis: string;
  createdAt: number;
  sources?: GroundingSource[];
  status?: 'caught' | 'not_caught'; // New field for status
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

export interface FlightStatus {
  heading: number;
  speed: number;
  altitude: number;
  isFlying: boolean;
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

export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'user' | 'banned';
  isApproved: boolean;
  email?: string;
  permissions: UserPermissions;
}

export interface MapUser {
  id: string;
  username: string;
  lat: number;
  lng: number;
  color: string; // To give each user a unique dot color
  lastUpdated: number;
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
