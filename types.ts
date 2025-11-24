
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

export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  isApproved: boolean; // New field for approval status
  email?: string; // Added email for admin dashboard
}

export interface MapUser {
  id: string;
  username: string;
  lat: number;
  lng: number;
  color: string; // To give each user a unique dot color
  lastUpdated: number;
}
