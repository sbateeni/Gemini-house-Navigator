
import React, { useEffect, useRef } from 'react';
import { MapNote, RouteData, MapUser } from '../types';

declare global {
  interface Window {
    L: any;
  }
}

interface LeafletMapProps {
  isSatellite: boolean;
  notes: MapNote[];
  selectedNote: MapNote | null;
  setSelectedNote: (note: MapNote | null) => void;
  onMapClick: (lat: number, lng: number) => void;
  flyToTarget: { lat: number; lng: number; zoom?: number; timestamp: number; showPulse?: boolean } | null;
  tempMarkerCoords: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number } | null;
  currentRoute: RouteData | null;
  otherUsers?: MapUser[]; // List of other live users
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  isSatellite,
  notes,
  selectedNote,
  setSelectedNote,
  onMapClick,
  flyToTarget,
  tempMarkerCoords,
  userLocation,
  currentRoute,
  otherUsers = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const userMarkersRef = useRef<{ [key: string]: any }>({}); // Store other user markers

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false
      }).setView([40.7128, -74.0060], 13);
      
      layerGroupRef.current = window.L.layerGroup().addTo(map);
      routeLayerRef.current = window.L.layerGroup().addTo(map); // Separate layer for routes
      
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
    }
  }, []); // Only runs once on mount

  // Handle Satellite / Dark Mode
  useEffect(() => {
    if (!layerGroupRef.current || !window.L) return;

    layerGroupRef.current.clearLayers();

    if (isSatellite) {
      const imagery = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      });
      const labels = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      const transport = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      layerGroupRef.current.addLayer(imagery);
      layerGroupRef.current.addLayer(transport);
      layerGroupRef.current.addLayer(labels);
    } else {
      const darkLayer = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      });
      layerGroupRef.current.addLayer(darkLayer);
    }
  }, [isSatellite]);

  // Handle FlyTo Logic
  useEffect(() => {
    if (mapInstanceRef.current && flyToTarget) {
      mapInstanceRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 14, {
        animate: true,
        duration: 1.5
      });

      if (flyToTarget.showPulse) {
          const pulseIcon = window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="width: 40px; height: 40px; border: 3px solid #3b82f6; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          const tempMarker = window.L.marker([flyToTarget.lat, flyToTarget.lng], { icon: pulseIcon }).addTo(mapInstanceRef.current);
          setTimeout(() => mapInstanceRef.current.removeLayer(tempMarker), 4000);
      }
    }
  }, [flyToTarget]);

  // Handle Current User Location Marker (The "Me" dot)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    
    if (userMarkerRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }

    const userIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `
        <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">YOU</div>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #3b82f6; border: 2px solid white; border-radius: 50%; z-index: 2;"></div>
            <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse 2s infinite;"></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { 
        icon: userIcon,
        zIndexOffset: 1000 
    }).addTo(mapInstanceRef.current);

  }, [userLocation]);

  // Handle Other Users Markers (Live Tracking)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Get list of current active IDs
    const activeIds = new Set(otherUsers.map(u => u.id));

    // Remove users who went offline
    Object.keys(userMarkersRef.current).forEach(userId => {
        if (!activeIds.has(userId)) {
            map.removeLayer(userMarkersRef.current[userId]);
            delete userMarkersRef.current[userId];
        }
    });

    // Add or Update markers for online users
    otherUsers.forEach(user => {
        const customHtml = `
            <div style="position: relative; width: 0; height: 0;">
                <div style="
                    position: absolute; 
                    bottom: 12px; 
                    left: 50%; 
                    transform: translateX(-50%); 
                    background: rgba(15, 23, 42, 0.8); 
                    backdrop-filter: blur(4px);
                    color: ${user.color}; 
                    padding: 2px 8px; 
                    border-radius: 6px; 
                    font-size: 11px; 
                    font-weight: 700; 
                    white-space: nowrap; 
                    border: 1px solid ${user.color};
                    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                ">
                    ${user.username}
                </div>
                <div style="
                    position: absolute; 
                    top: -6px; 
                    left: -6px; 
                    width: 12px; 
                    height: 12px; 
                    background: ${user.color}; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 0 10px ${user.color};
                "></div>
            </div>
        `;

        const icon = window.L.divIcon({
            className: 'custom-div-icon',
            html: customHtml,
            iconSize: [0, 0], // CSS handles size
        });

        if (userMarkersRef.current[user.id]) {
            // Update existing marker position
            userMarkersRef.current[user.id].setLatLng([user.lat, user.lng]);
            userMarkersRef.current[user.id].setIcon(icon); // Update icon in case name/color changed
        } else {
            // Create new marker
            const marker = window.L.marker([user.lat, user.lng], { icon, zIndexOffset: 900 });
            marker.addTo(map);
            userMarkersRef.current[user.id] = marker;
        }
    });

  }, [otherUsers]);

  // Handle Route Drawing
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    
    // Clear previous route
    routeLayerRef.current.clearLayers();

    if (currentRoute && currentRoute.coordinates.length > 0) {
        const polyline = window.L.polyline(currentRoute.coordinates, {
            color: '#3b82f6', // Blue route
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '1, 10', // Initial dash for animation
        }).addTo(routeLayerRef.current);

        // Animate the line
        let dashOffset = 0;
        const animate = () => {
             dashOffset -= 1;
             polyline.setStyle({ dashArray: 'none' }); // Solid line after "loading" or keep simple
             // For a simple solid line, just:
             polyline.setStyle({ dashArray: null });
        };
        setTimeout(animate, 100);

        // Fit bounds to show entire route
        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [currentRoute]);

  // Handle Notes Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clean up old markers
    Object.keys(markersRef.current).forEach(key => {
      if (key !== 'temp' && key !== 'temp_click') {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    // Add note markers
    notes.forEach(note => {
      const icon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          width: 32px; 
          height: 32px; 
          background-color: ${isSatellite ? '#ef4444' : '#3b82f6'}; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 4px 12px ${isSatellite ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.5)'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.3s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 30]
      });

      const marker = window.L.marker([note.lat, note.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div class="font-sans min-w-[160px]">
            <strong class="text-sm text-blue-400 block mb-1">${note.locationName}</strong>
            <p class="text-xs mb-2 line-clamp-3">${note.userNote}</p>
          </div>
        `);

      marker.on('popupopen', () => setSelectedNote(note));
      markersRef.current[note.id] = marker;
      
      // Open popup if this is the selected note
      if (selectedNote?.id === note.id) {
         marker.openPopup();
      }
    });

  }, [notes, isSatellite, selectedNote]); // Re-run when notes or view mode changes

  // Handle Temp Marker (when user clicks map)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    if (markersRef.current['temp_click']) {
        mapInstanceRef.current.removeLayer(markersRef.current['temp_click']);
        delete markersRef.current['temp_click'];
    }

    if (tempMarkerCoords) {
        const pulseIcon = window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="width: 20px; height: 20px; background: #3b82f6; border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          const marker = window.L.marker([tempMarkerCoords.lat, tempMarkerCoords.lng], { icon: pulseIcon }).addTo(mapInstanceRef.current);
          markersRef.current['temp_click'] = marker;
    }

  }, [tempMarkerCoords]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-900 outline-none" />;
};
