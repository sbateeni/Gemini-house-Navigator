
import React, { useEffect, useRef } from 'react';
import { MapNote, RouteData, MapUser } from '../types';
import { offlineMaps } from '../services/offlineMaps';

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
  otherUsers?: MapUser[]; 
  onUserClick?: (user: MapUser) => void; 
  secondaryRoute?: RouteData | null;
  canSeeOthers?: boolean;
  onNavigate?: (note: MapNote) => void;
  onDispatch?: (note: MapNote) => void;
  userRole?: string | null;
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
  otherUsers = [],
  onUserClick,
  secondaryRoute,
  canSeeOthers = true,
  onNavigate,
  onDispatch,
  userRole
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const secondaryRouteLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const userMarkersRef = useRef<{ [key: string]: any }>({});

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false
      }).setView([40.7128, -74.0060], 13);
      
      layerGroupRef.current = window.L.layerGroup().addTo(map);
      routeLayerRef.current = window.L.layerGroup().addTo(map);
      secondaryRouteLayerRef.current = window.L.layerGroup().addTo(map);
      
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
      
      map.on('popupopen', (e: any) => {
         const popupNode = e.popup._contentNode;
         const navBtn = popupNode.querySelector('.btn-navigate');
         if (navBtn && onNavigate) {
            navBtn.onclick = () => {
                const noteId = navBtn.getAttribute('data-id');
                const note = notes.find(n => n.id === noteId);
                if (note) onNavigate(note);
            };
         }
         const dispatchBtn = popupNode.querySelector('.btn-dispatch');
         if (dispatchBtn && onDispatch) {
            dispatchBtn.onclick = () => {
                const noteId = dispatchBtn.getAttribute('data-id');
                const note = notes.find(n => n.id === noteId);
                if (note) onDispatch(note);
            };
         }
      });

      mapInstanceRef.current = map;

      // Event Listener for Offline Download
      window.addEventListener('download-offline-map', ((e: CustomEvent) => {
          if (e.detail && e.detail.callback) {
              const bounds = map.getBounds();
              e.detail.callback(bounds);
          }
      }) as EventListener);
    }
  }, []);

  // Handle Satellite / Dark Mode with Offline Capability
  useEffect(() => {
    if (!layerGroupRef.current || !window.L) return;

    layerGroupRef.current.clearLayers();

    // Define custom Offline TileLayer
    const OfflineTileLayer = window.L.TileLayer.extend({
        createTile: function(coords: any, done: any) {
            const tile = document.createElement('img');
            
            // 1. Try IndexedDB first (Fastest/Offline)
            offlineMaps.getTile(coords.x, coords.y, coords.z).then((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    tile.src = url;
                    done(null, tile);
                } else {
                    // 2. If not in DB, fallback to network
                    tile.src = this.getTileUrl(coords);
                    
                    // If online and we want to cache passively (optional, disabled for now to save space)
                    /* 
                    if (navigator.onLine) {
                         fetch(tile.src).then(res => res.blob()).then(blob => {
                             offlineMaps.saveTile(coords.x, coords.y, coords.z, blob);
                         });
                    }
                    */
                }
            }).catch(() => {
                // Fallback on error
                tile.src = this.getTileUrl(coords);
            });

            window.L.DomEvent.on(tile, 'load', window.L.Util.bind(this._tileOnLoad, this, done, tile));
            window.L.DomEvent.on(tile, 'error', window.L.Util.bind(this._tileOnError, this, done, tile));
            return tile;
        }
    });

    if (isSatellite) {
      // Use standard URL for "online" path, but our custom class intercepts it
      const imagery = new OfflineTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      });
      // We keep labels online-only for now as they are complex to cache separately without significant storage
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
       // Also attempt offline support for standard map if desired, but user asked for Satellite specifically usually
       const darkLayer = new OfflineTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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

  // Handle Current User Location Marker
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
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { 
        icon: userIcon,
        zIndexOffset: 1000 
    }).addTo(mapInstanceRef.current);

  }, [userLocation]);

  // Handle Other Users Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const visibleUsers = canSeeOthers ? otherUsers : [];
    const activeIds = new Set(visibleUsers.map(u => u.id));

    Object.keys(userMarkersRef.current).forEach(userId => {
        if (!activeIds.has(userId)) {
            map.removeLayer(userMarkersRef.current[userId]);
            delete userMarkersRef.current[userId];
        }
    });

    visibleUsers.forEach(user => {
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
                    cursor: pointer;
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
                    cursor: pointer;
                "></div>
            </div>
        `;

        const icon = window.L.divIcon({
            className: 'custom-div-icon',
            html: customHtml,
            iconSize: [0, 0],
        });

        if (userMarkersRef.current[user.id]) {
            userMarkersRef.current[user.id].setLatLng([user.lat, user.lng]);
            userMarkersRef.current[user.id].setIcon(icon);
        } else {
            const marker = window.L.marker([user.lat, user.lng], { icon, zIndexOffset: 900 });
            marker.addTo(map);
            marker.on('click', () => {
                if(onUserClick) onUserClick(user);
            });
            userMarkersRef.current[user.id] = marker;
        }
    });

  }, [otherUsers, onUserClick, canSeeOthers]);

  // Handle Main Route Drawing
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    
    routeLayerRef.current.clearLayers();

    if (currentRoute && currentRoute.coordinates.length > 0) {
        const polyline = window.L.polyline(currentRoute.coordinates, {
            color: '#3b82f6', 
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
        }).addTo(routeLayerRef.current);

        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [currentRoute]);

  // Handle Secondary Route Drawing
  useEffect(() => {
    if (!mapInstanceRef.current || !secondaryRouteLayerRef.current) return;
    
    secondaryRouteLayerRef.current.clearLayers();

    if (secondaryRoute && secondaryRoute.coordinates.length > 0) {
        const polyline = window.L.polyline(secondaryRoute.coordinates, {
            color: '#a855f7', 
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '12, 12',
        }).addTo(secondaryRouteLayerRef.current);
        
        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [secondaryRoute]);

  // Handle Notes Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    Object.keys(markersRef.current).forEach(key => {
      if (key !== 'temp' && key !== 'temp_click') {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

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

      const popupContent = `
        <div class="font-sans min-w-[180px]">
          <strong class="text-sm text-blue-400 block mb-1">${note.locationName}</strong>
          <p class="text-xs mb-3 line-clamp-2 text-slate-300">${note.userNote}</p>
          <div class="flex gap-2">
             <button class="btn-navigate flex-1 bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-blue-500 transition-colors" data-id="${note.id}">
                NAVIGATE
             </button>
             ${userRole === 'admin' ? `
               <button class="btn-dispatch flex-1 bg-purple-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-purple-500 transition-colors" data-id="${note.id}">
                  DISPATCH
               </button>
             ` : ''}
          </div>
        </div>
      `;

      const marker = window.L.marker([note.lat, note.lng], { icon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('popupopen', () => setSelectedNote(note));
      markersRef.current[note.id] = marker;
      
      if (selectedNote?.id === note.id) {
         marker.openPopup();
      }
    });

  }, [notes, isSatellite, selectedNote, userRole]);

  // Handle Temp Marker
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
