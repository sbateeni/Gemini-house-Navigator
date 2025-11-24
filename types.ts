export interface MapNote {
  id: string;
  lat: number;
  lng: number;
  userNote: string;
  locationName: string;
  aiAnalysis: string;
  createdAt: number;
  sources?: GroundingSource[];
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