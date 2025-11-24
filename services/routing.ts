import { RouteData } from '../types';

// Using OSRM public demo server (Free, no API key required for basic usage)
const OSRM_API_URL = 'https://router.project-osrm.org/route/v1/driving';

export const getRoute = async (
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number
): Promise<RouteData | null> => {
  try {
    // OSRM Request Breakdown:
    // - overview=full: Returns the most detailed path geometry available.
    // - geometries=geojson: Returns coordinates as precise line segments, enabling the map to draw curves and turns accurately.
    // - steps=true: useful for turn-by-turn instructions (unused here but good for debug)
    const url = `${OSRM_API_URL}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('No route found', data);
      return null;
    }

    const route = data.routes[0];
    
    // OSRM returns coordinates as [lng, lat] in GeoJSON
    // Leaflet needs [lat, lng]. We must map them here.
    const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);

    return {
      coordinates,
      distance: route.distance, // meters
      duration: route.duration // seconds
    };

  } catch (error) {
    console.error('Routing error:', error);
    return null;
  }
};