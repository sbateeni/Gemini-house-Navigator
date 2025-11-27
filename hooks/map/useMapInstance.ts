
import { useEffect, useRef, useState } from 'react';

const DEFAULT_CENTER: [number, number] = [31.9522, 35.2332]; // Palestine
const DEFAULT_ZOOM = 9;

export function useMapInstance(onMapClick: (lat: number, lng: number) => void) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM); 
      
      // Layer groups
      const layerGroup = window.L.layerGroup().addTo(map);
      const routeLayer = window.L.layerGroup().addTo(map);
      const secondaryRouteLayer = window.L.layerGroup().addTo(map);
      
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      // Handle offline map download bounds
      window.addEventListener('download-offline-map', ((e: CustomEvent) => {
          if (e.detail && e.detail.callback) {
              const bounds = map.getBounds();
              e.detail.callback(bounds);
          }
      }) as EventListener);

      mapInstanceRef.current = map;
      // Store layer groups on the map instance for other hooks to access, or return them
      mapInstanceRef.current.layerGroup = layerGroup;
      mapInstanceRef.current.routeLayer = routeLayer;
      mapInstanceRef.current.secondaryRouteLayer = secondaryRouteLayer;

      setIsMapReady(true);
    }
  }, []); // Empty dependency array to run once

  return { mapContainerRef, mapInstanceRef, isMapReady };
}
